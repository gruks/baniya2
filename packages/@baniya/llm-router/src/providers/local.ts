import type { LLMResponse, RouterConfig } from '@baniya/types';
import { LocalProviderUnavailableError } from '../errors';

const DEFAULT_OLLAMA_URL = process.env.BANIYA_OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_LMSTUDIO_URL = process.env.BANIYA_LMSTUDIO_URL || 'http://localhost:1234';

export interface LocalSettings {
  ollamaUrl?: string;
  ollamaEnabled?: boolean;
  defaultLocalModel?: string;
}

function getUrls(settings?: LocalSettings): { ollamaUrl: string; lmstudioUrl: string } {
  return {
    ollamaUrl: settings?.ollamaUrl || DEFAULT_OLLAMA_URL,
    lmstudioUrl: DEFAULT_LMSTUDIO_URL,
  };
}

let cachedProvider: { name: 'ollama' | 'lmstudio'; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function detectLocalProvider(settings?: LocalSettings): Promise<'ollama' | 'lmstudio'> {
  if (cachedProvider && Date.now() - cachedProvider.checkedAt < CACHE_TTL_MS) {
    return cachedProvider.name;
  }

  const { ollamaUrl, lmstudioUrl } = getUrls(settings);

  try {
    const res = await fetch(`${ollamaUrl}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      cachedProvider = { name: 'ollama', checkedAt: Date.now() };
      return 'ollama';
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${lmstudioUrl}/v1/models`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      cachedProvider = { name: 'lmstudio', checkedAt: Date.now() };
      return 'lmstudio';
    }
  } catch { /* ignore */ }

  throw new LocalProviderUnavailableError();
}

async function callOllama(prompt: string, config: RouterConfig, settings?: LocalSettings): Promise<LLMResponse> {
  const { ollamaUrl } = getUrls(settings);
  const model = config.preferredLocalModel || settings?.defaultLocalModel || process.env.BANIYA_DEFAULT_LOCAL_MODEL || 'qwen3-vl:4b';

  const messages: { role: string; content: string }[] = [];
  if (config.systemPrompt) messages.push({ role: 'system', content: config.systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { num_predict: config.maxTokens ?? 2048 },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    message?: { content: string };
    model: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };

  return {
    text: data.message?.content ?? '',
    model: `ollama/${data.model}`,
    tokensIn: data.prompt_eval_count ?? 0,
    tokensOut: data.eval_count ?? 0,
    costUSD: 0,
    latencyMs: 0,
    routing: 'local',
    sensitivity: 'public',
    sanitizerApplied: false,
  };
}

async function callLMStudio(prompt: string, config: RouterConfig, settings?: LocalSettings): Promise<LLMResponse> {
  const { lmstudioUrl } = getUrls(settings);
  const res = await fetch(`${lmstudioUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens ?? 1000,
      temperature: config.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`LM Studio returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    text: data.choices[0]?.message?.content ?? '',
    model: `lmstudio/${data.model}`,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    costUSD: 0,
    latencyMs: 0,
    routing: 'local',
    sensitivity: 'public',
    sanitizerApplied: false,
  };
}

export async function callLocal(prompt: string, config: RouterConfig, settings?: LocalSettings): Promise<LLMResponse> {
  if (settings?.ollamaEnabled === false) {
    throw new LocalProviderUnavailableError();
  }
  const provider = await detectLocalProvider(settings);
  if (provider === 'ollama') return callOllama(prompt, config, settings);
  return callLMStudio(prompt, config, settings);
}

export async function checkOllamaStatus(settings?: LocalSettings): Promise<boolean> {
  try {
    const { ollamaUrl } = getUrls(settings);
    const res = await fetch(`${ollamaUrl}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkLMStudioStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${DEFAULT_LMSTUDIO_URL}/v1/models`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(settings?: LocalSettings): Promise<string[]> {
  try {
    const { ollamaUrl } = getUrls(settings);
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models?: { name: string }[] };
    return (data.models ?? []).map(m => m.name);
  } catch {
    return [];
  }
}
