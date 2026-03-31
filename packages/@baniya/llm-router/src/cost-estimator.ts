export const PRICE_PER_1K: Record<string, { in: number; out: number }> = {
  'gpt-4o':             { in: 0.005,    out: 0.015   },
  'gpt-4o-mini':        { in: 0.00015,  out: 0.0006  },
  'claude-sonnet-4-6':  { in: 0.003,    out: 0.015   },
  'claude-haiku-4-5':   { in: 0.00025,  out: 0.00125 },
  'gemini-2.0-flash':   { in: 0.0001,   out: 0.0004  },
  'gemini-2.5-flash':   { in: 0.0003,   out: 0.0025  },
  'ollama/*':           { in: 0,        out: 0       },
  'lmstudio/*':         { in: 0,        out: 0       },
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const key = Object.keys(PRICE_PER_1K).find(k =>
    k.endsWith('/*') ? model.startsWith(k.replace('/*', '')) : model === k
  ) ?? 'gpt-4o-mini';
  const p = PRICE_PER_1K[key];
  return (tokensIn / 1000) * p.in + (tokensOut / 1000) * p.out;
}
