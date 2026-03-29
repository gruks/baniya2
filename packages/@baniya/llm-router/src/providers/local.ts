import type { LLMResponse, RouterConfig } from '@baniya/types';
import { LocalProviderUnavailableError } from '../errors';

const OLLAMA_URL = process.env.BANIYA_OLLAMA_URL || 'http://localhost:11434';
const LMSTUDIO_URL = process.env.BANIYA_LMSTUDIO_URL || 'http://localhost:1234';

let cachedProvider: { name: 'ollama' | 'lmstudio'; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function detectLocalProvider(): Promise<'ollama' | 'lmstudio'> {
  if (cachedProvider && Date.now() - cachedProvider.checkedAt < CACHE_TTL_MS) {
    return cachedProvider.name;
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      cachedProvider = { name: 'ollama', checkedAt: Date.now() };
      return 'ollama';
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${LMSTUDIO_URL}/v1/models`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      cachedProvider = { name: 'lmstudio', checkedAt: Date.now() };
      return 'lmstudio';
    }
  } catch { /* ignore */ }

  throw new LocalProviderUnavailableError();
}

async function callOllama(prompt: string, config: RouterConfig): Promise<LLMResponse> {
  const model = config.preferredLocalModel || 'llama3.2';
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system: config.systemPrompt || undefined,
      stream: false,
      options: {
        num_predict: config.maxTokens ?? 1000,
        temperature: config.temperature ?? 0.7,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    response: string;
    model: string;
    prompt_eval_count?: number;
    eval_count?: number;
  };

  return {
    text: data.response,
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

async function callLMStudio(prompt: string, config: RouterConfig): Promise<LLMResponse> {
  const res = await fetch(`${LMSTUDIO_URL}/v1/chat/completions`, {
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

export async function callLocal(prompt: string, config: RouterConfig): Promise<LLMResponse> {
  const provider = await detectLocalProvider();
  if (provider === 'ollama') return callOllama(prompt, config);
  return callLMStudio(prompt, config);
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkLMStudioStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${LMSTUDIO_URL}/v1/models`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models?: { name: string }[] };
    return (data.models ?? []).map(m => m.name);
  } catch {
    return [];
  }
}
