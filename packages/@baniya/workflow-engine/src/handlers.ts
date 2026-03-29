import type { NodeHandler, NodeHandlerOutput, ExecutionContext, RouterConfig } from '@baniya/types';
import { BaniyaRouter } from '@baniya/llm-router';
import { classify } from '@baniya/data-classifier';

const router = new BaniyaRouter();

// Helper: safely evaluate JS expression in a sandboxed-ish way
function safeEval(expression: string, input: unknown): unknown {
  // Strip dangerous constructs
  const sanitized = expression
    .replace(/process\./g, '')
    .replace(/require\s*\(/g, '')
    .replace(/import\s*\(/g, '')
    .replace(/eval\s*\(/g, '')
    .replace(/__proto__/g, '')
    .replace(/constructor\s*\[/g, '');

  const fn = new Function('input', `"use strict"; ${sanitized.includes('return') ? sanitized : `return (${sanitized})`}`);
  return fn(input);
}

// Helper: resolve {{ input.field }} template expressions
function resolveTemplate(template: string, input: unknown): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expr) => {
    try {
      const value = safeEval(expr.trim(), input);
      return String(value ?? '');
    } catch {
      return `{{${expr}}}`;
    }
  });
}

function getInputText(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    return obj.text ? String(obj.text) : JSON.stringify(input);
  }
  return String(input ?? '');
}

// ─── Trigger Handlers ─────────────────────────────────────

export const triggerManualHandler: NodeHandler = {
  async execute(input) {
    return { main: input };
  },
};

export const triggerWebhookHandler: NodeHandler = {
  async execute(input) {
    return { main: input };
  },
};

export const triggerScheduleHandler: NodeHandler = {
  async execute(input) {
    return { main: input ?? { triggeredAt: new Date().toISOString() } };
  },
};

// ─── AI Handlers ──────────────────────────────────────────

export const aiLlmHandler: NodeHandler = {
  async execute(input, config, context) {
    const prompt = resolveTemplate(String(config.prompt ?? ''), input);
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
      preferredLocalModel: config.preferredLocalModel as string,
      preferredCloudModel: config.preferredCloudModel as string,
      maxTokens: config.maxTokens as number,
      temperature: config.temperature as number,
      systemPrompt: config.systemPrompt as string,
    };

    const response = await router.route(input, prompt, routerConfig);
    return { main: response };
  },
};

export const aiClassifyHandler: NodeHandler = {
  async execute(input) {
    const result = classify(input);
    if (result.level === 'public') {
      return { public: { ...result, data: input } } as NodeHandlerOutput;
    }
    return { private: { ...result, data: input } } as NodeHandlerOutput;
  },
};

export const aiEmbedHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    // Try Ollama embeddings
    try {
      const ollamaUrl = process.env.BANIYA_OLLAMA_URL || 'http://localhost:11434';
      const model = (config.model as string) || 'nomic-embed-text';
      const res = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const data = await res.json() as { embedding: number[] };
        return { main: { embedding: data.embedding, model: `ollama/${model}`, dimensions: data.embedding.length } };
      }
    } catch { /* fallback */ }
    return { main: { embedding: [], model: 'none', error: 'No embedding provider available' } };
  },
};

export const aiSummariseHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
    };
    const response = await router.route(input, `Summarise the following:\n\n${text}`, routerConfig);
    return { main: response };
  },
};

export const aiExtractHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    const fields = String(config.fields ?? '');
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
    };
    const response = await router.route(input, `Extract ${fields} from:\n\n${text}`, routerConfig);
    return { main: response };
  },
};

export const aiRewriteHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    const tone = String(config.tone ?? 'professional');
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
    };
    const response = await router.route(input, `Rewrite in ${tone} tone:\n\n${text}`, routerConfig);
    return { main: response };
  },
};

export const aiTranslateHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    const language = String(config.language ?? 'English');
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
    };
    const response = await router.route(input, `Translate to ${language}:\n\n${text}`, routerConfig);
    return { main: response };
  },
};

export const aiModerateHandler: NodeHandler = {
  async execute(input) {
    const text = getInputText(input);
    // Basic keyword-based moderation (no external API needed)
    const unsafePatterns = /\b(kill|murder|hack|exploit|bomb|weapon|drug|porn|terrorist)\b/gi;
    const isFlagged = unsafePatterns.test(text);
    if (isFlagged) {
      return { flagged: { flagged: true, text, reason: 'Content flagged by keyword moderation' } };
    }
    return { main: { flagged: false, text } };
  },
};

// ─── Logic Handlers ───────────────────────────────────────

export const logicIfHandler: NodeHandler = {
  async execute(input, config) {
    const expression = String(config.expression ?? 'true');
    const result = safeEval(expression, input);
    if (result) {
      return { true: input };
    }
    return { false: input };
  },
};

export const logicSwitchHandler: NodeHandler = {
  async execute(input, config) {
    const expression = String(config.expression ?? '');
    const casesStr = String(config.cases ?? '');
    const cases = casesStr.split('\n').map(c => c.trim()).filter(Boolean);
    const value = String(safeEval(expression, input));

    for (let i = 0; i < cases.length; i++) {
      if (value === cases[i]) {
        return { [`case_${i}`]: input } as NodeHandlerOutput;
      }
    }
    return { default: input } as NodeHandlerOutput;
  },
};

export const logicMergeHandler: NodeHandler = {
  async execute(input) {
    // Merge simply passes through all accumulated inputs
    return { main: input };
  },
};

export const logicLoopHandler: NodeHandler = {
  async execute(input, config) {
    const arrayField = config.arrayField as string;
    const data = input as Record<string, unknown>;
    const items = arrayField ? (data[arrayField] as unknown[]) : (Array.isArray(input) ? input : [input]);
    return { main: { items, count: items?.length ?? 0 } };
  },
};

export const logicWaitHandler: NodeHandler = {
  async execute(input, config) {
    const seconds = Number(config.seconds ?? 1);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return { main: input };
  },
};

// ─── Data Handlers ────────────────────────────────────────

export const dataSetHandler: NodeHandler = {
  async execute(input, config) {
    const existing = (typeof input === 'object' && input !== null) ? { ...input as Record<string, unknown> } : {};
    let newValues: Record<string, unknown> = {};
    try {
      const valuesStr = String(config.values ?? '{}');
      newValues = JSON.parse(valuesStr);
    } catch {
      newValues = {};
    }
    return { main: { ...existing, ...newValues } };
  },
};

export const dataTransformHandler: NodeHandler = {
  async execute(input, config) {
    const expression = String(config.expression ?? 'return input');
    const result = safeEval(expression, input);
    return { main: result };
  },
};

export const dataFilterHandler: NodeHandler = {
  async execute(input, config) {
    const expression = String(config.expression ?? 'true');
    const items = Array.isArray(input) ? input : [];
    const filtered = items.filter(item => {
      try {
        const fn = new Function('item', `"use strict"; return (${expression})`);
        return fn(item);
      } catch {
        return false;
      }
    });
    return { main: filtered };
  },
};

export const dataAggregateHandler: NodeHandler = {
  async execute(input, config) {
    const items = Array.isArray(input) ? input : [];
    const operation = String(config.operation ?? 'count');
    const field = String(config.field ?? '');

    switch (operation) {
      case 'count':
        return { main: { count: items.length } };
      case 'sum': {
        const sum = items.reduce((acc, item) => acc + (Number((item as Record<string, unknown>)[field]) || 0), 0);
        return { main: { sum, field } };
      }
      case 'average': {
        const total = items.reduce((acc, item) => acc + (Number((item as Record<string, unknown>)[field]) || 0), 0);
        return { main: { average: items.length > 0 ? total / items.length : 0, field } };
      }
      case 'groupBy': {
        const groups: Record<string, unknown[]> = {};
        for (const item of items) {
          const key = String((item as Record<string, unknown>)[field] ?? 'undefined');
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        }
        return { main: { groups, field } };
      }
      default:
        return { main: { count: items.length } };
    }
  },
};

// ─── Output Handlers ──────────────────────────────────────

export const outputResponseHandler: NodeHandler = {
  async execute(input, config, context) {
    return { main: { statusCode: config.statusCode ?? 200, body: input } };
  },
};

export const outputLogHandler: NodeHandler = {
  async execute(input, config, context) {
    const label = String(config.label ?? 'log');
    console.log(`[Baniya Log][${label}]`, JSON.stringify(input, null, 2));
    return { main: input };
  },
};
