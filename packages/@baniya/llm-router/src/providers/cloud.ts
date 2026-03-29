import type { LLMResponse, RouterConfig } from '@baniya/types';
import { CloudProviderUnavailableError } from '../errors';

type CloudProvider = 'openai' | 'anthropic' | 'gemini';

function getAvailableProvider(preferred?: string): { provider: CloudProvider; model: string; key: string } {
  // If a preferred model is specified, try to match
  if (preferred) {
    if (preferred.startsWith('gpt-') && process.env.OPENAI_API_KEY) {
      return { provider: 'openai', model: preferred, key: process.env.OPENAI_API_KEY };
    }
    if (preferred.startsWith('claude-') && process.env.ANTHROPIC_API_KEY) {
      return { provider: 'anthropic', model: preferred, key: process.env.ANTHROPIC_API_KEY };
    }
    if (preferred.startsWith('gemini-') && process.env.GOOGLE_API_KEY) {
      return { provider: 'gemini', model: preferred, key: process.env.GOOGLE_API_KEY };
    }
  }

  // Cheapest-first fallback priority
  if (process.env.GOOGLE_API_KEY) {
    return { provider: 'gemini', model: 'gemini-1.5-flash', key: process.env.GOOGLE_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', model: 'gpt-4o-mini', key: process.env.OPENAI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: 'claude-haiku-4-5', key: process.env.ANTHROPIC_API_KEY };
  }

  throw new CloudProviderUnavailableError();
}

async function callOpenAI(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: config.maxTokens ?? 1000,
      temperature: config.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`OpenAI returned ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    choices: { message: { content: string } }[];
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    text: data.choices[0]?.message?.content ?? '',
    model,
    tokensIn: data.usage.prompt_tokens,
    tokensOut: data.usage.completion_tokens,
    costUSD: 0,
    latencyMs: 0,
    routing: 'cloud',
    sensitivity: 'public',
    sanitizerApplied: false,
  };
}

async function callAnthropic(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens ?? 1000,
      system: config.systemPrompt || undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`Anthropic returned ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    content: { text: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };

  return {
    text: data.content[0]?.text ?? '',
    model,
    tokensIn: data.usage.input_tokens,
    tokensOut: data.usage.output_tokens,
    costUSD: 0,
    latencyMs: 0,
    routing: 'cloud',
    sensitivity: 'public',
    sanitizerApplied: false,
  };
}

async function callGemini(prompt: string, config: RouterConfig, model: string, key: string): Promise<LLMResponse> {
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
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? 1000,
        temperature: config.temperature ?? 0.7,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`Gemini returned ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    model,
    tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
    costUSD: 0,
    latencyMs: 0,
    routing: 'cloud',
    sensitivity: 'public',
    sanitizerApplied: false,
  };
}

export async function callCloud(prompt: string, config: RouterConfig): Promise<LLMResponse> {
  const { provider, model, key } = getAvailableProvider(config.preferredCloudModel);

  switch (provider) {
    case 'openai':    return callOpenAI(prompt, config, model, key);
    case 'anthropic': return callAnthropic(prompt, config, model, key);
    case 'gemini':    return callGemini(prompt, config, model, key);
  }
}
