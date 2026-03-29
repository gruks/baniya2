import type { NodeHandler, NodeHandlerOutput, ExecutionContext, RouterConfig } from '@baniya/types';
import { BaniyaRouter } from '@baniya/llm-router';
import type { RouterSettings, CloudSettings } from '@baniya/llm-router';
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

    // Build per-node cloud settings if an API key is provided in config
    const nodeApiKey = config.apiKey as string | undefined;
    const nodeApiProvider = (config.apiProvider as string) || 'auto';
    let routerSettings: RouterSettings | undefined;
    if (nodeApiKey) {
      const cloudSettings: CloudSettings = {};
      if (nodeApiProvider === 'openai') cloudSettings.openaiApiKey = nodeApiKey;
      else if (nodeApiProvider === 'anthropic') cloudSettings.anthropicApiKey = nodeApiKey;
      else if (nodeApiProvider === 'gemini') cloudSettings.googleApiKey = nodeApiKey;
      else {
        // auto: detect by key prefix
        if (nodeApiKey.startsWith('sk-ant-')) cloudSettings.anthropicApiKey = nodeApiKey;
        else if (nodeApiKey.startsWith('AIza')) cloudSettings.googleApiKey = nodeApiKey;
        else cloudSettings.openaiApiKey = nodeApiKey;
      }
      routerSettings = { cloud: cloudSettings };
    }

    const response = await router.route(input, prompt, routerConfig, routerSettings);
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

// ─── Storage Handlers ─────────────────────────────────────

import * as fs from 'fs/promises';
import * as path from 'path';

// Base directory for all storage operations — sandboxed to prevent traversal
const STORAGE_BASE = path.resolve(
  process.env.BANIYA_STORAGE_PATH ?? path.join(process.cwd(), 'storage')
);

/** Resolve and validate a user-supplied path stays within STORAGE_BASE */
function resolveSafe(userPath: string): string {
  const resolved = path.resolve(STORAGE_BASE, userPath);
  if (!resolved.startsWith(STORAGE_BASE + path.sep) && resolved !== STORAGE_BASE) {
    throw new Error(`Path "${userPath}" escapes the storage base directory.`);
  }
  return resolved;
}

export const storageReadHandler: NodeHandler = {
  async execute(input, config) {
    const filePath = resolveTemplate(String(config.path ?? ''), input);
    const encoding = (config.encoding as BufferEncoding) || 'utf8';
    const abs = resolveSafe(filePath);
    const content = await fs.readFile(abs, encoding);
    const stat = await fs.stat(abs);
    return { main: { path: filePath, content, size: stat.size, modifiedAt: stat.mtime.toISOString() } };
  },
};

export const storageWriteHandler: NodeHandler = {
  async execute(input, config) {
    const filePath = resolveTemplate(String(config.path ?? ''), input);
    const content = resolveTemplate(String(config.content ?? ''), input);
    const appendMode = config.append === 'append';
    const createDirs = config.createDirs !== 'false';
    const abs = resolveSafe(filePath);

    if (createDirs) {
      await fs.mkdir(path.dirname(abs), { recursive: true });
    }

    if (appendMode) {
      await fs.appendFile(abs, content, 'utf8');
    } else {
      await fs.writeFile(abs, content, 'utf8');
    }

    const stat = await fs.stat(abs);
    return { main: { path: filePath, written: content.length, size: stat.size, mode: appendMode ? 'append' : 'overwrite' } };
  },
};

export const storageListHandler: NodeHandler = {
  async execute(input, config) {
    const dirPath = resolveTemplate(String(config.path ?? '.'), input);
    const recursive = config.recursive === 'true';
    const filter = config.filter as string | undefined;
    const abs = resolveSafe(dirPath);

    async function listDir(dir: string, base: string): Promise<object[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const results: object[] = [];
      for (const entry of entries) {
        const rel = path.relative(STORAGE_BASE, path.join(dir, entry.name));
        if (filter) {
          const pattern = filter.replace(/\./g, '\\.').replace(/\*/g, '.*');
          if (!new RegExp(`^${pattern}$`).test(entry.name)) {
            if (!entry.isDirectory()) continue;
          }
        }
        const item = { name: entry.name, path: rel, type: entry.isDirectory() ? 'directory' : 'file' };
        results.push(item);
        if (recursive && entry.isDirectory()) {
          const children = await listDir(path.join(dir, entry.name), base);
          results.push(...children);
        }
      }
      return results;
    }

    const files = await listDir(abs, abs);
    return { main: { path: dirPath, count: files.length, files } };
  },
};

export const storageDeleteHandler: NodeHandler = {
  async execute(input, config) {
    const filePath = resolveTemplate(String(config.path ?? ''), input);
    const abs = resolveSafe(filePath);
    await fs.unlink(abs);
    return { main: { path: filePath, deleted: true } };
  },
};

export const storageMkdirHandler: NodeHandler = {
  async execute(input, config) {
    const dirPath = resolveTemplate(String(config.path ?? ''), input);
    const abs = resolveSafe(dirPath);
    await fs.mkdir(abs, { recursive: true });
    return { main: { path: dirPath, created: true } };
  },
};

// ─── Folder Handlers (unrestricted local FS via /api/fs) ──────────
// These nodes operate on any absolute path the user configures,
// mirroring the trust model of the File Agent panel.

const FS_SERVER = process.env.BANIYA_FS_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const FS_TOKEN  = process.env.BANIYA_FS_TOKEN ?? '';   // set if auth required

async function fsRequest(method: 'GET' | 'POST' | 'DELETE', endpoint: string, body?: unknown, params?: Record<string, string>) {
  const url = new URL(`${FS_SERVER}/api/fs/${endpoint}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (FS_TOKEN) headers['Authorization'] = `Bearer ${FS_TOKEN}`;
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? `FS request failed: ${res.status}`);
  return data;
}

/**
 * folder.connect — establishes the folder root for downstream nodes.
 * Outputs: { folderPath, files[] } so the next node can iterate or pick files.
 */
export const folderConnectHandler: NodeHandler = {
  async execute(input, config) {
    const folderPath = resolveTemplate(String(config.folderPath ?? ''), input);
    if (!folderPath) throw new Error('folder.connect: folderPath is required');
    const recursive = config.recursive === 'true';
    const filter = config.filter as string | undefined;
    const data = await fsRequest('GET', 'list', undefined, {
      root: folderPath,
      path: '.',
      ...(recursive ? { recursive: 'true' } : {}),
      ...(filter ? { filter } : {}),
    });
    return {
      main: {
        folderPath,
        files: (data as any).items ?? [],
        count: ((data as any).items ?? []).length,
      },
    };
  },
};

/**
 * folder.list — list a sub-directory inside a connected folder.
 */
export const folderListHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveTemplate(String(config.folderPath ?? inp.folderPath ?? ''), input);
    const subPath = resolveTemplate(String(config.subPath ?? '.'), input);
    const recursive = config.recursive === 'true';
    const data = await fsRequest('GET', 'list', undefined, {
      root: folderPath,
      path: subPath,
      ...(recursive ? { recursive: 'true' } : {}),
    });
    return { main: { folderPath, path: subPath, files: (data as any).items ?? [] } };
  },
};

/**
 * folder.read — read a single file from the connected folder.
 * Passes content downstream so AI nodes can process it.
 */
export const folderReadHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveTemplate(String(config.folderPath ?? inp.folderPath ?? ''), input);
    const filePath   = resolveTemplate(String(config.filePath  ?? inp.filePath  ?? ''), input);
    if (!folderPath || !filePath) throw new Error('folder.read: folderPath and filePath are required');
    const data = await fsRequest('GET', 'read', undefined, { root: folderPath, path: filePath });
    return { main: { folderPath, filePath, content: data.content, size: data.size, modifiedAt: data.modifiedAt } };
  },
};

/**
 * folder.write — write (or overwrite) a file in the connected folder.
 * Content can come from upstream AI output via {{ input.text }}.
 */
export const folderWriteHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveTemplate(String(config.folderPath ?? inp.folderPath ?? ''), input);
    const filePath   = resolveTemplate(String(config.filePath  ?? inp.filePath  ?? ''), input);
    const content    = resolveTemplate(String(config.content   ?? inp.text ?? inp.content ?? ''), input);
    const appendMode = config.mode === 'append';
    if (!folderPath || !filePath) throw new Error('folder.write: folderPath and filePath are required');
    const data = await fsRequest('POST', appendMode ? 'append' : 'write', {
      root: folderPath,
      path: filePath,
      content,
      createDirs: true,
    });
    return { main: { folderPath, filePath, written: content.length, ...data } };
  },
};

/**
 * folder.patch — apply a string replacement to a file.
 * Useful for AI-driven code edits: oldStr → newStr.
 */
export const folderPatchHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveTemplate(String(config.folderPath ?? inp.folderPath ?? ''), input);
    const filePath   = resolveTemplate(String(config.filePath  ?? inp.filePath  ?? ''), input);
    const oldStr     = resolveTemplate(String(config.oldStr    ?? inp.oldStr    ?? ''), input);
    const newStr     = resolveTemplate(String(config.newStr    ?? inp.newStr    ?? ''), input);
    if (!folderPath || !filePath) throw new Error('folder.patch: folderPath and filePath are required');
    const data = await fsRequest('POST', 'patch', { root: folderPath, path: filePath, oldStr, newStr });
    return { main: { folderPath, filePath, patched: true, ...data } };
  },
};
