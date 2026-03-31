import type {
  NodeHandler,
  NodeHandlerOutput,
  ExecutionContext,
  RouterConfig,
} from '@baniya/types';
import { BaniyaRouter } from '@baniya/llm-router';
import type { RouterSettings, CloudSettings } from '@baniya/llm-router';
import { classify } from '@baniya/data-classifier';
import { executeAgentNode, chatAgentNode } from '@baniya/agents';

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

  const fn = new Function(
    'input',
    `"use strict"; ${sanitized.includes('return') ? sanitized : `return (${sanitized})`}`
  );
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
      preferredLocalModel: (config.preferredLocalModel as string) || undefined,
      preferredCloudModel: (config.preferredCloudModel as string) || undefined,
      maxTokens: config.maxTokens ? Number(config.maxTokens) : undefined,
      systemPrompt: (config.systemPrompt as string) || undefined,
    };

    // Build per-node cloud settings if an API key is provided in config
    const nodeApiKey = config.apiKey as string | undefined;
    const nodeApiProvider = (config.apiProvider as string) || 'auto';
    let routerSettings: RouterSettings | undefined;
    if (nodeApiKey) {
      const cloudSettings: CloudSettings = {};
      if (nodeApiProvider === 'openai') cloudSettings.openaiApiKey = nodeApiKey;
      else if (nodeApiProvider === 'anthropic')
        cloudSettings.anthropicApiKey = nodeApiKey;
      else if (nodeApiProvider === 'gemini')
        cloudSettings.googleApiKey = nodeApiKey;
      else {
        // auto: detect by key prefix
        if (nodeApiKey.startsWith('sk-ant-'))
          cloudSettings.anthropicApiKey = nodeApiKey;
        else if (nodeApiKey.startsWith('AIza'))
          cloudSettings.googleApiKey = nodeApiKey;
        else cloudSettings.openaiApiKey = nodeApiKey;
      }
      routerSettings = { cloud: cloudSettings };
    }

    const response = await router.route(
      input,
      prompt,
      routerConfig,
      routerSettings
    );
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
      const ollamaUrl =
        process.env.BANIYA_OLLAMA_URL || 'http://localhost:11434';
      const model = (config.model as string) || 'nomic-embed-text';
      const res = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { embedding: number[] };
        return {
          main: {
            embedding: data.embedding,
            model: `ollama/${model}`,
            dimensions: data.embedding.length,
          },
        };
      }
    } catch {
      /* fallback */
    }
    return {
      main: {
        embedding: [],
        model: 'none',
        error: 'No embedding provider available',
      },
    };
  },
};

export const aiSummariseHandler: NodeHandler = {
  async execute(input, config) {
    const text = getInputText(input);
    const routerConfig: RouterConfig = {
      forceRoute: (config.forceRoute as RouterConfig['forceRoute']) || 'auto',
    };
    const response = await router.route(
      input,
      `Summarise the following:\n\n${text}`,
      routerConfig
    );
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
    const response = await router.route(
      input,
      `Extract ${fields} from:\n\n${text}`,
      routerConfig
    );
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
    const response = await router.route(
      input,
      `Rewrite in ${tone} tone:\n\n${text}`,
      routerConfig
    );
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
    const response = await router.route(
      input,
      `Translate to ${language}:\n\n${text}`,
      routerConfig
    );
    return { main: response };
  },
};

export const aiModerateHandler: NodeHandler = {
  async execute(input) {
    const text = getInputText(input);
    // Basic keyword-based moderation (no external API needed)
    const unsafePatterns =
      /\b(kill|murder|hack|exploit|bomb|weapon|drug|porn|terrorist)\b/gi;
    const isFlagged = unsafePatterns.test(text);
    if (isFlagged) {
      return {
        flagged: {
          flagged: true,
          text,
          reason: 'Content flagged by keyword moderation',
        },
      };
    }
    return { main: { flagged: false, text } };
  },
};

// ─── Ollama (direct local LLM, no router) ─────────────────
export const aiOllamaHandler: NodeHandler = {
  async execute(input, config) {
    const ollamaUrl =
      (config.ollamaUrl as string) ||
      process.env.BANIYA_OLLAMA_URL ||
      'http://localhost:11434';
    const model =
      (config.model as string) ||
      process.env.BANIYA_DEFAULT_LOCAL_MODEL ||
      'qwen3-vl:4b';
    const maxTokens = config.maxTokens ? Number(config.maxTokens) : 2048;
    const timeoutMs = config.timeout ? Number(config.timeout) * 1000 : 60_000;

    const rawPrompt = String(config.prompt ?? '').trim();
    if (!rawPrompt) throw new Error('Ollama node: Prompt field is required.');
    // /no_think prefix suppresses qwen3 extended thinking
    const prompt = '/no_think ' + resolveTemplate(rawPrompt, input);
    const systemPrompt =
      (config.systemPrompt as string) ||
      'You are a helpful assistant. Be concise and direct.';

    // Use /api/generate — qwen3-vl returns content in response field, not message.content
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok)
      throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      response: string;
      model: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const text = (data.response ?? '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();

    return {
      main: {
        text,
        model: `ollama/${data.model}`,
        tokensIn: data.prompt_eval_count ?? 0,
        tokensOut: data.eval_count ?? 0,
        costUSD: 0,
        latencyMs: 0,
        routing: 'local',
        sensitivity: 'public',
        sanitizerApplied: false,
      },
    };
  },
};

// ─── AI Agent (agentic loop — LLM plans, node executes) ────
// The LLM returns a JSON action plan; the node executes each
// action directly: write_file, append_file, run_command, read_file.
const AGENT_SYSTEM = `You are a coding agent. Given a task, respond ONLY with a JSON array of actions.
Each action must be one of:
  {"action":"write_file","path":"relative/path","content":"file content here"}
  {"action":"append_file","path":"relative/path","content":"content to append"}
  {"action":"run_command","command":"shell command to run"}
  {"action":"read_file","path":"relative/path"}
  {"action":"done","summary":"what was accomplished"}
Rules: respond with ONLY the JSON array, no markdown, no explanation. Paths are relative to the working folder. Always end with done.`;

export const aiAgentHandler: NodeHandler = {
  async execute(input, config) {
    const ollamaUrl =
      (config.ollamaUrl as string) ||
      process.env.BANIYA_OLLAMA_URL ||
      'http://localhost:11434';
    const model =
      (config.model as string) ||
      process.env.BANIYA_DEFAULT_LOCAL_MODEL ||
      'qwen3-vl:4b';
    const maxTokens = config.maxTokens ? Number(config.maxTokens) : 1024;
    const timeoutMs = config.timeout ? Number(config.timeout) * 1000 : 90_000;

    const inp = input as Record<string, unknown>;
    const folderPath =
      (config.folderPath as string) ||
      (inp.folderPath as string) ||
      process.cwd();
    const rawTask = String(config.task ?? '').trim();
    if (!rawTask) throw new Error('Agent node: Task field is required.');
    const task = resolveTemplate(rawTask, input);

    const fileList = Array.isArray(inp.files)
      ? (inp.files as any[])
          .slice(0, 20)
          .map((f: any) => f.path || f.name)
          .join('\n')
      : '';

    const prompt = `/no_think\nWorking folder: ${folderPath}\n${fileList ? `Files:\n${fileList}\n` : ''}Task: ${task}`;

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: AGENT_SYSTEM,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok)
      throw new Error(
        `Ollama agent returned ${res.status}: ${await res.text()}`
      );

    const data = (await res.json()) as { response: string; model: string };
    let raw = (data.response ?? '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .trim();
    raw = raw
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    let actions: any[];
    try {
      actions = JSON.parse(raw);
      if (!Array.isArray(actions)) actions = [actions];
    } catch {
      // Model didn't return JSON — write raw output as a file
      actions = [
        { action: 'write_file', path: 'agent_output.txt', content: raw },
        {
          action: 'done',
          summary: 'Wrote raw model output to agent_output.txt',
        },
      ];
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const results: { action: string; path?: string; result: string }[] = [];

    for (const act of actions) {
      try {
        if (act.action === 'write_file') {
          const abs = path.resolve(folderPath, act.path);
          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.writeFile(abs, act.content ?? '', 'utf8');
          results.push({
            action: 'write_file',
            path: act.path,
            result: 'written',
          });
        } else if (act.action === 'append_file') {
          const abs = path.resolve(folderPath, act.path);
          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.appendFile(abs, act.content ?? '', 'utf8');
          results.push({
            action: 'append_file',
            path: act.path,
            result: 'appended',
          });
        } else if (act.action === 'read_file') {
          const abs = path.resolve(folderPath, act.path);
          const content = await fs.readFile(abs, 'utf8');
          results.push({
            action: 'read_file',
            path: act.path,
            result: content.slice(0, 500),
          });
        } else if (act.action === 'run_command') {
          const { stdout, stderr } = await execAsync(act.command, {
            cwd: folderPath,
            timeout: 30_000,
          });
          results.push({
            action: 'run_command',
            result: (stdout + stderr).slice(0, 500),
          });
        } else if (act.action === 'done') {
          results.push({ action: 'done', result: act.summary ?? 'completed' });
        }
      } catch (e: any) {
        results.push({
          action: act.action,
          path: act.path,
          result: `ERROR: ${e.message}`,
        });
      }
    }

    const summary =
      results.find(r => r.action === 'done')?.result ?? 'Agent completed';
    return {
      main: {
        summary,
        actions: results,
        folderPath,
        model: `ollama/${data.model}`,
        costUSD: 0,
        routing: 'local',
      },
    };
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
    const cases = casesStr
      .split('\n')
      .map(c => c.trim())
      .filter(Boolean);
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
    const items = arrayField
      ? (data[arrayField] as unknown[])
      : Array.isArray(input)
        ? input
        : [input];
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
    const existing =
      typeof input === 'object' && input !== null
        ? { ...(input as Record<string, unknown>) }
        : {};
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
        const sum = items.reduce(
          (acc, item) =>
            acc + (Number((item as Record<string, unknown>)[field]) || 0),
          0
        );
        return { main: { sum, field } };
      }
      case 'average': {
        const total = items.reduce(
          (acc, item) =>
            acc + (Number((item as Record<string, unknown>)[field]) || 0),
          0
        );
        return {
          main: { average: items.length > 0 ? total / items.length : 0, field },
        };
      }
      case 'groupBy': {
        const groups: Record<string, unknown[]> = {};
        for (const item of items) {
          const key = String(
            (item as Record<string, unknown>)[field] ?? 'undefined'
          );
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
  if (
    !resolved.startsWith(STORAGE_BASE + path.sep) &&
    resolved !== STORAGE_BASE
  ) {
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
    return {
      main: {
        path: filePath,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      },
    };
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
    return {
      main: {
        path: filePath,
        written: content.length,
        size: stat.size,
        mode: appendMode ? 'append' : 'overwrite',
      },
    };
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
        const item = {
          name: entry.name,
          path: rel,
          type: entry.isDirectory() ? 'directory' : 'file',
        };
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

// ─── Folder Handlers (direct local FS — no HTTP, no auth needed) ─
// Runs inside the server process, reads/writes any absolute path the
// user configured. Same trust model as VS Code / File Agent panel.

function resolveFolder(folderPath: string): string {
  if (!folderPath) throw new Error('folderPath is required');
  return path.resolve(folderPath);
}

async function folderListDir(
  root: string,
  subPath: string,
  recursive: boolean,
  filter?: string
): Promise<object[]> {
  const dir = path.resolve(root, subPath);
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e: any) {
    throw new Error(`Cannot list "${dir}": ${e.message}`);
  }
  const results: object[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(root, fullPath).replace(/\\/g, '/');
    if (filter) {
      const pattern = new RegExp(
        '^' + filter.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      if (!entry.isDirectory() && !pattern.test(entry.name)) continue;
    }
    let size = 0,
      modifiedAt = '';
    try {
      const st = await fs.stat(fullPath);
      size = st.size;
      modifiedAt = st.mtime.toISOString();
    } catch {
      /* ok */
    }
    results.push({
      name: entry.name,
      path: rel,
      type: entry.isDirectory() ? 'directory' : 'file',
      size,
      modifiedAt,
    });
    if (recursive && entry.isDirectory()) {
      results.push(...(await folderListDir(root, rel, true, filter)));
    }
  }
  return results;
}

export const folderConnectHandler: NodeHandler = {
  async execute(input, config) {
    const folderPath = resolveFolder(
      resolveTemplate(String(config.folderPath ?? ''), input)
    );
    const recursive = config.recursive === 'true';
    const filter = config.filter as string | undefined;

    // Verify the folder actually exists
    try {
      const stat = await fs.stat(folderPath);
      if (!stat.isDirectory())
        throw new Error(`"${folderPath}" is a file, not a directory`);
    } catch (e: any) {
      if (e.code === 'ENOENT')
        throw new Error(
          `Folder not found: "${folderPath}". Check the path is correct.`
        );
      throw e;
    }

    const files = await folderListDir(folderPath, '.', recursive, filter);
    return { main: { folderPath, files, count: files.length } };
  },
};

export const folderListHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveFolder(
      resolveTemplate(String(config.folderPath || inp.folderPath || ''), input)
    );
    const subPath = resolveTemplate(String(config.subPath || '.'), input);
    const recursive = config.recursive === 'true';
    const files = await folderListDir(folderPath, subPath, recursive);
    return { main: { folderPath, path: subPath, files } };
  },
};

export const folderReadHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveFolder(
      resolveTemplate(String(config.folderPath || inp.folderPath || ''), input)
    );
    const filePath = resolveTemplate(
      String(config.filePath || inp.filePath || inp.path || ''),
      input
    );
    if (!filePath) throw new Error('folder.read: filePath is required');
    const abs = path.resolve(folderPath, filePath);
    const stat = await fs.stat(abs).catch(e => {
      throw new Error(`Cannot stat "${abs}": ${e.message}`);
    });
    if (stat.size > 5 * 1024 * 1024)
      throw new Error(
        `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB > 5MB)`
      );
    const content = await fs.readFile(abs, 'utf8');
    return {
      main: {
        folderPath,
        filePath,
        content,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      },
    };
  },
};

export const folderWriteHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveFolder(
      resolveTemplate(String(config.folderPath || inp.folderPath || ''), input)
    );
    const filePath = resolveTemplate(
      String(config.filePath || inp.filePath || ''),
      input
    );
    if (!filePath) throw new Error('folder.write: filePath is required');
    // content: prefer config template, then upstream text/content field
    const rawContent = String(config.content ?? inp.text ?? inp.content ?? '');
    const content = resolveTemplate(rawContent, input);
    const appendMode = config.mode === 'append';
    const abs = path.resolve(folderPath, filePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    if (appendMode) {
      await fs.appendFile(abs, content, 'utf8');
    } else {
      await fs.writeFile(abs, content, 'utf8');
    }
    const stat = await fs.stat(abs);
    return {
      main: {
        folderPath,
        filePath,
        written: content.length,
        size: stat.size,
        mode: appendMode ? 'append' : 'overwrite',
      },
    };
  },
};

export const folderPatchHandler: NodeHandler = {
  async execute(input, config) {
    const inp = input as Record<string, unknown>;
    const folderPath = resolveFolder(
      resolveTemplate(String(config.folderPath || inp.folderPath || ''), input)
    );
    const filePath = resolveTemplate(
      String(config.filePath || inp.filePath || ''),
      input
    );
    if (!filePath) throw new Error('folder.patch: filePath is required');
    const oldStr = resolveTemplate(
      String(config.oldStr || inp.oldStr || ''),
      input
    );
    const newStr = resolveTemplate(
      String(config.newStr || inp.newStr || ''),
      input
    );
    const abs = path.resolve(folderPath, filePath);
    let content = await fs.readFile(abs, 'utf8').catch(e => {
      throw new Error(`Cannot read "${abs}": ${e.message}`);
    });
    if (!content.includes(oldStr))
      throw new Error(`oldStr not found in ${filePath}`);
    content = content.replace(oldStr, newStr);
    await fs.writeFile(abs, content, 'utf8');
    return { main: { folderPath, filePath, patched: true } };
  },
};

// Export agent handlers for workflow engine
export { executeAgentNode, chatAgentNode };
