import type { LLMResponse, RouterConfig } from '@baniya/types';
import { CloudProviderUnavailableError } from '../errors';

type CloudProvider = 'openai' | 'anthropic' | 'gemini';

export interface CloudSettings {
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  googleApiKey?: string | null;
  defaultCloudModel?: string;
}

function getAvailableProvider(preferred?: string, settings?: CloudSettings): { provider: CloudProvider; model: string; key: string } {
  const openaiKey = settings?.openaiApiKey ?? process.env.OPENAI_API_KEY;
  const anthropicKey = settings?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  const googleKey = settings?.googleApiKey ?? process.env.GOOGLE_API_KEY;

  if (preferred) {
    if (preferred.startsWith('gpt-') && openaiKey) return { provider: 'openai', model: preferred, key: openaiKey };
    if (preferred.startsWith('claude-') && anthropicKey) return { provider: 'anthropic', model: preferred, key: anthropicKey };
    if (preferred.startsWith('gemini-') && googleKey) return { provider: 'gemini', model: preferred, key: googleKey };
  }

  if (googleKey) return { provider: 'gemini', model: settings?.defaultCloudModel || 'gemini-2.0-flash', key: googleKey };
  if (openaiKey) return { provider: 'openai', model: 'gpt-4o-mini', key: openaiKey };
  if (anthropicKey) return { provider: 'anthropic', model: 'claude-haiku-4-5', key: anthropicKey };

  throw new CloudProviderUnavailableError();
}

function parseMaxTokens(val: unknown): number {
  if (val === undefined || val === null || val === '') return 1000;
  const n = Number(val);
  return isNaN(n) || n <= 0 ? 1000 : n;
}

async function callOpenAI(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: parseMaxTokens(config.maxTokens),
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = new Error(`OpenAI returned ${res.status}: ${await res.text()}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = await res.json() as { choices: { message: { content: string } }[]; usage: { prompt_tokens: number; completion_tokens: number } };
  return {
    text: data.choices[0]?.message?.content ?? '',
    model, tokensIn: data.usage.prompt_tokens, tokensOut: data.usage.completion_tokens,
    costUSD: 0, latencyMs: 0, routing: 'cloud', sensitivity: 'public', sanitizerApplied: false,
  };
}

async function callAnthropic(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: parseMaxTokens(config.maxTokens),
      system: config.systemPrompt || undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = new Error(`Anthropic returned ${res.status}: ${await res.text()}`);
    (err as any).status = res.status;
    throw err;
  }
  const data = await res.json() as { content: { text: string }[]; usage: { input_tokens: number; output_tokens: number } };
  return {
    text: data.content[0]?.text ?? '',
    model, tokensIn: data.usage.input_tokens, tokensOut: data.usage.output_tokens,
    costUSD: 0, latencyMs: 0, routing: 'cloud', sensitivity: 'public', sanitizerApplied: false,
  };
}

// Models to try in order for Gemini — fallback chain on 429/quota errors
const GEMINI_FALLBACK_CHAIN = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
];

async function callGeminiModel(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = [];
  if (config.systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: config.systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: parseMaxTokens(config.maxTokens) },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text();
    // Extract retryDelay if present for a friendlier message
    const retryMatch = body.match(/"retryDelay":\s*"(\d+)s"/);
    const retryIn = retryMatch ? ` Retry in ${retryMatch[1]}s.` : '';
    const err = new Error(`Gemini returned ${res.status}: ${body}${retryIn}`);
    (err as any).status = res.status;
    throw err;
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    model, tokensIn: data.usageMetadata?.promptTokenCount ?? 0, tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
    costUSD: 0, latencyMs: 0, routing: 'cloud', sensitivity: 'public', sanitizerApplied: false,
  };
}

async function callGemini(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  // Build fallback chain: preferred model first, then the rest
  const chain = [model, ...GEMINI_FALLBACK_CHAIN.filter(m => m !== model)];
  let lastErr: Error = new Error('No Gemini models available');

  for (const m of chain) {
    try {
      const result = await callGeminiModel(prompt, config, m, key);
      result.model = m;
      return result;
    } catch (err: any) {
      lastErr = err;
      // Only fall back on quota/rate-limit errors (429) or model-not-found (404)
      if (err.status === 429 || err.status === 404) continue;
      throw err; // other errors (400, 401, 500) — don't retry
    }
  }
  throw lastErr;
}

export async function callCloud(prompt: string, config: RouterConfig, settings?: CloudSettings): Promise<LLMResponse> {
  const { provider, model, key } = getAvailableProvider(config.preferredCloudModel, settings);
  switch (provider) {
    case 'openai':    return callOpenAI(prompt, config, model, key);
    case 'anthropic': return callAnthropic(prompt, config, model, key);
    case 'gemini':    return callGemini(prompt, config, model, key);
  }
}
