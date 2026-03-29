import type { NodeMeta } from '@baniya/types';

// SVG path icons for each category
const ICONS = {
  manual:     'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  webhook:    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  schedule:   'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4v6l4 2',
  ai:         'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1.27a7 7 0 0 1-13.46 0H5a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2z',
  logic:      'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  data:       'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  output:     'M17 7l-10 5 10 5V7z',
  ifNode:     'M12 2l10 10-10 10L2 12 12 2z',
  switchNode: 'M12 3v18M3 12h18M3 6h18M3 18h18',
  merge:      'M8 6l4 6 4-6M8 18l4-6 4 6',
  loop:       'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  wait:       'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4l3 3',
  set:        'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  transform:  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  filter:     'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  aggregate:  'M18 20V10 M12 20V4 M6 20v-6',
  response:   'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  log:        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8',
  classify:   'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  embed:      'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  moderate:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

export const NODE_REGISTRY: NodeMeta[] = [
  // ─── Triggers ───────────────────────────────────────────
  {
    type: 'trigger.manual',
    label: 'Manual Trigger',
    description: 'Start workflow manually with a payload',
    category: 'trigger',
    color: '#6366F1',
    icon: ICONS.manual,
    handles: {
      inputs: [],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'payload', label: 'Payload (JSON)', type: 'code', required: false, placeholder: '{}', description: 'Default payload when triggered manually' },
    ],
  },
  {
    type: 'trigger.webhook',
    label: 'Webhook Trigger',
    description: 'Listen for incoming HTTP requests',
    category: 'trigger',
    color: '#6366F1',
    icon: ICONS.webhook,
    handles: {
      inputs: [],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: [{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }], default: 'POST' },
    ],
  },
  {
    type: 'trigger.schedule',
    label: 'Schedule Trigger',
    description: 'Run on a cron schedule',
    category: 'trigger',
    color: '#6366F1',
    icon: ICONS.schedule,
    handles: {
      inputs: [],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'cron', label: 'Cron Expression', type: 'text', required: true, placeholder: '0 9 * * 1-5', description: 'Standard cron expression' },
    ],
  },

  // ─── AI Nodes ───────────────────────────────────────────
  {
    type: 'ai.llm',
    label: 'AI LLM',
    description: 'Send a prompt to an LLM with automatic routing',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.ai,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Output', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'prompt', label: 'Prompt', type: 'textarea', required: true, placeholder: 'Your prompt here. Use {{ input.field }} for data' },
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', required: false },
      { key: 'apiProvider', label: 'API Provider', type: 'select', options: [{ label: 'Auto (env keys)', value: 'auto' }, { label: 'OpenAI', value: 'openai' }, { label: 'Anthropic', value: 'anthropic' }, { label: 'Google Gemini', value: 'gemini' }], default: 'auto' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: 'sk-... (overrides env variable)' },
      { key: 'forceRoute', label: 'Force Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Hybrid', value: 'hybrid' }, { label: 'Cloud', value: 'cloud' }], default: 'auto' },
      { key: 'preferredLocalModel', label: 'Preferred Local Model', type: 'text', default: 'llama3.2' },
      { key: 'preferredCloudModel', label: 'Preferred Cloud Model', type: 'select', options: [{ label: 'GPT-4o', value: 'gpt-4o' }, { label: 'GPT-4o Mini', value: 'gpt-4o-mini' }, { label: 'Claude Sonnet', value: 'claude-sonnet-4-6' }, { label: 'Claude Haiku', value: 'claude-haiku-4-5' }, { label: 'Gemini Flash', value: 'gemini-1.5-flash' }, { label: 'Gemini Pro', value: 'gemini-1.5-pro' }], default: 'gpt-4o-mini' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 1, max: 8000 },
      { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1 },
    ],
  },
  {
    type: 'ai.classify',
    label: 'Baniya Classify',
    description: 'Classify data sensitivity and route accordingly',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.classify,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'private', label: 'Private', type: 'source' },
        { id: 'public', label: 'Public', type: 'source' },
      ],
    },
    configSchema: [],
  },
  {
    type: 'ai.embed',
    label: 'AI Embed',
    description: 'Generate embedding vector from text',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.embed,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'model', label: 'Embedding Model', type: 'text', default: 'nomic-embed-text' },
    ],
  },
  {
    type: 'ai.summarise',
    label: 'AI Summarise',
    description: 'Summarise the input text',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.ai,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'forceRoute', label: 'Force Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Cloud', value: 'cloud' }], default: 'auto' },
    ],
  },
  {
    type: 'ai.extract',
    label: 'AI Extract',
    description: 'Extract structured fields from text',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.ai,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'fields', label: 'Fields to Extract', type: 'textarea', required: true, placeholder: 'name, email, phone' },
      { key: 'forceRoute', label: 'Force Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Cloud', value: 'cloud' }], default: 'auto' },
    ],
  },
  {
    type: 'ai.rewrite',
    label: 'AI Rewrite',
    description: 'Rewrite text in a different tone',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.ai,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'tone', label: 'Tone', type: 'select', options: [{ label: 'Professional', value: 'professional' }, { label: 'Casual', value: 'casual' }, { label: 'Formal', value: 'formal' }, { label: 'Friendly', value: 'friendly' }], default: 'professional' },
      { key: 'forceRoute', label: 'Force Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Cloud', value: 'cloud' }], default: 'auto' },
    ],
  },
  {
    type: 'ai.translate',
    label: 'AI Translate',
    description: 'Translate text to another language',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.ai,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'language', label: 'Target Language', type: 'text', required: true, placeholder: 'Hindi' },
      { key: 'forceRoute', label: 'Force Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Cloud', value: 'cloud' }], default: 'auto' },
    ],
  },
  {
    type: 'ai.moderate',
    label: 'AI Moderate',
    description: 'Check content for unsafe material',
    category: 'ai',
    color: '#0D9E75',
    icon: ICONS.moderate,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Safe', type: 'source' },
        { id: 'flagged', label: 'Flagged', type: 'source' },
      ],
    },
    configSchema: [],
  },

  // ─── Logic Nodes ────────────────────────────────────────
  {
    type: 'logic.if',
    label: 'IF',
    description: 'Branch based on a condition',
    category: 'logic',
    color: '#F59E0B',
    icon: ICONS.ifNode,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'true', label: 'True', type: 'source' },
        { id: 'false', label: 'False', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'expression', label: 'Condition', type: 'code', required: true, placeholder: "input.sentiment === 'negative'", description: 'JS expression returning boolean. `input` available as variable.' },
    ],
  },
  {
    type: 'logic.switch',
    label: 'Switch',
    description: 'Route to different outputs based on value',
    category: 'logic',
    color: '#F59E0B',
    icon: ICONS.switchNode,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'case_0', label: 'Case 1', type: 'source' },
        { id: 'case_1', label: 'Case 2', type: 'source' },
        { id: 'case_2', label: 'Case 3', type: 'source' },
        { id: 'default', label: 'Default', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'expression', label: 'Expression', type: 'code', required: true, description: 'JS expression to evaluate' },
      { key: 'cases', label: 'Cases', type: 'textarea', required: true, placeholder: 'One case per line' },
    ],
  },
  {
    type: 'logic.merge',
    label: 'Merge',
    description: 'Wait for all branches and merge outputs',
    category: 'logic',
    color: '#F59E0B',
    icon: ICONS.merge,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [],
  },
  {
    type: 'logic.loop',
    label: 'Loop',
    description: 'Iterate over array input',
    category: 'logic',
    color: '#F59E0B',
    icon: ICONS.loop,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Item', type: 'source' }],
    },
    configSchema: [
      { key: 'arrayField', label: 'Array Field', type: 'text', placeholder: 'items', description: 'Field name containing the array to iterate' },
    ],
  },
  {
    type: 'logic.wait',
    label: 'Wait',
    description: 'Pause execution for N seconds',
    category: 'logic',
    color: '#F59E0B',
    icon: ICONS.wait,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'seconds', label: 'Wait Time (seconds)', type: 'number', required: true, default: 1, min: 0, max: 300 },
    ],
  },

  // ─── Data Nodes ─────────────────────────────────────────
  {
    type: 'data.set',
    label: 'Set Data',
    description: 'Set key-value pairs on the data object',
    category: 'data',
    color: '#8B5CF6',
    icon: ICONS.set,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'values', label: 'Values (JSON)', type: 'code', required: true, placeholder: '{ "key": "value" }', description: 'JSON object with key-value pairs to set' },
    ],
  },
  {
    type: 'data.transform',
    label: 'Transform',
    description: 'Transform data with a JS expression',
    category: 'data',
    color: '#8B5CF6',
    icon: ICONS.transform,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'expression', label: 'Expression', type: 'code', required: true, placeholder: 'return { ...input, newField: input.value.toUpperCase() }', description: 'JS expression. `input` is available. Must return transformed value.' },
    ],
  },
  {
    type: 'data.filter',
    label: 'Filter',
    description: 'Filter array data by expression',
    category: 'data',
    color: '#8B5CF6',
    icon: ICONS.filter,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'expression', label: 'Filter Expression', type: 'code', required: true, placeholder: 'item.age > 18', description: 'JS expression. `item` is available for each array element.' },
    ],
  },
  {
    type: 'data.aggregate',
    label: 'Aggregate',
    description: 'Group, count, or sum array data',
    category: 'data',
    color: '#8B5CF6',
    icon: ICONS.aggregate,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [{ id: 'main', label: 'Output', type: 'source' }],
    },
    configSchema: [
      { key: 'operation', label: 'Operation', type: 'select', options: [{ label: 'Count', value: 'count' }, { label: 'Sum', value: 'sum' }, { label: 'Average', value: 'average' }, { label: 'Group By', value: 'groupBy' }], required: true, default: 'count' },
      { key: 'field', label: 'Field', type: 'text', placeholder: 'amount', description: 'Field to aggregate on' },
    ],
  },

  // ─── Storage Nodes ──────────────────────────────────────
  {
    type: 'storage.read',
    label: 'Read File',
    description: 'Read a file from the local filesystem',
    category: 'storage',
    color: '#0EA5E9',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Content', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'path', label: 'File Path', type: 'text', required: true, placeholder: 'data/output.txt', description: 'Relative path from storage base dir (e.g. folder/file.txt). Absolute paths like C:/ or D:/ are forbidden.' },
      { key: 'encoding', label: 'Encoding', type: 'select', options: [{ label: 'UTF-8 (text)', value: 'utf8' }, { label: 'Base64 (binary)', value: 'base64' }], default: 'utf8' },
    ],
  },
  {
    type: 'storage.write',
    label: 'Write File',
    description: 'Write or overwrite a file on the local filesystem',
    category: 'storage',
    color: '#0EA5E9',
    icon: 'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Result', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'path', label: 'File Path', type: 'text', required: true, placeholder: 'data/output.txt', description: 'Relative path from storage base dir. Absolute paths are forbidden. Use {{ input.path }} for dynamic paths.' },
      { key: 'content', label: 'Content', type: 'textarea', placeholder: '{{ input.text }}', description: 'Content to write. Supports {{ input.field }} templates.' },
      { key: 'append', label: 'Mode', type: 'select', options: [{ label: 'Overwrite', value: 'overwrite' }, { label: 'Append', value: 'append' }], default: 'overwrite' },
      { key: 'createDirs', label: 'Create Directories', type: 'select', options: [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }], default: 'true' },
    ],
  },
  {
    type: 'storage.list',
    label: 'List Directory',
    description: 'List files and folders in a directory',
    category: 'storage',
    color: '#0EA5E9',
    icon: 'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Files', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'path', label: 'Directory Path', type: 'text', required: true, placeholder: 'data/', description: 'Relative path from storage base dir. Absolute paths are forbidden.' },
      { key: 'recursive', label: 'Recursive', type: 'select', options: [{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }], default: 'false' },
      { key: 'filter', label: 'Filter (glob)', type: 'text', placeholder: '*.txt', description: 'Optional glob pattern to filter results.' },
    ],
  },
  {
    type: 'storage.delete',
    label: 'Delete File',
    description: 'Delete a file from the local filesystem',
    category: 'storage',
    color: '#0EA5E9',
    icon: 'M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Result', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'path', label: 'File Path', type: 'text', required: true, placeholder: 'data/old.txt', description: 'Relative path from storage base dir. Absolute paths are forbidden.' },
    ],
  },
  {
    type: 'storage.mkdir',
    label: 'Make Directory',
    description: 'Create a directory (and any missing parents)',
    category: 'storage',
    color: '#0EA5E9',
    icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Result', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'path', label: 'Directory Path', type: 'text', required: true, placeholder: 'data/reports/2024', description: 'Relative path from storage base dir. Absolute paths are forbidden.' },
    ],
  },

  // ─── Output Nodes ───────────────────────────────────────
  {
    type: 'output.response',
    label: 'Response',
    description: 'Send HTTP response for webhook triggers',
    category: 'output',
    color: '#64748B',
    icon: ICONS.response,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [],
    },
    configSchema: [
      { key: 'statusCode', label: 'Status Code', type: 'number', default: 200, min: 100, max: 599 },
    ],
  },
  {
    type: 'output.log',
    label: 'Log Output',
    description: 'Write to execution log (no side effects)',
    category: 'output',
    color: '#64748B',
    icon: ICONS.log,
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [],
    },
    configSchema: [
      { key: 'label', label: 'Log Label', type: 'text', placeholder: 'debug', description: 'Label for log entry' },
    ],
  },
];

// ─── Folder Nodes (local drive, unrestricted) ───────────────────
NODE_REGISTRY.push(
  {
    type: 'folder.connect',
    label: 'Folder',
    description: 'Connect to any local folder. Outputs file listing for downstream AI nodes.',
    category: 'storage',
    color: '#EA580C',
    icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    handles: {
      inputs: [],
      outputs: [{ id: 'main', label: 'Files', type: 'source' }],
    },
    configSchema: [
      { key: 'folderPath', label: 'Folder Path', type: 'text', required: true, placeholder: 'C:\\Projects\\myapp  or  /home/user/project', description: 'Absolute path to the local folder.' },
      { key: 'recursive', label: 'Recursive', type: 'select', options: [{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }], default: 'false' },
      { key: 'filter', label: 'Filter (glob)', type: 'text', placeholder: '*.ts', description: 'Optional glob to filter files, e.g. *.md' },
    ],
  },
  {
    type: 'folder.list',
    label: 'Folder List',
    description: 'List a sub-directory inside a connected folder.',
    category: 'storage',
    color: '#EA580C',
    icon: 'M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z',
    handles: {
      inputs: [{ id: 'in', label: 'Folder', type: 'target' }],
      outputs: [{ id: 'main', label: 'Files', type: 'source' }],
    },
    configSchema: [
      { key: 'folderPath', label: 'Folder Path (override)', type: 'text', placeholder: 'Leave blank to use upstream folderPath' },
      { key: 'subPath', label: 'Sub-path', type: 'text', placeholder: 'src/components' },
      { key: 'recursive', label: 'Recursive', type: 'select', options: [{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }], default: 'false' },
    ],
  },
  {
    type: 'folder.read',
    label: 'Folder Read',
    description: 'Read a file from the connected folder and pass content to AI.',
    category: 'storage',
    color: '#EA580C',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Content', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'folderPath', label: 'Folder Path (override)', type: 'text', placeholder: 'Leave blank to use upstream folderPath' },
      { key: 'filePath', label: 'File Path', type: 'text', required: true, placeholder: 'src/index.ts  or  {{ input.path }}', description: 'Relative path inside the folder. Supports {{ input.path }} from upstream.' },
    ],
  },
  {
    type: 'folder.write',
    label: 'Folder Write',
    description: 'Write AI output back to a file in the connected folder.',
    category: 'storage',
    color: '#EA580C',
    icon: 'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Result', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'folderPath', label: 'Folder Path (override)', type: 'text', placeholder: 'Leave blank to use upstream folderPath' },
      { key: 'filePath', label: 'File Path', type: 'text', required: true, placeholder: 'output/result.md  or  {{ input.filePath }}' },
      { key: 'content', label: 'Content', type: 'textarea', placeholder: '{{ input.text }}', description: 'Use {{ input.text }} to write AI output.' },
      { key: 'mode', label: 'Mode', type: 'select', options: [{ label: 'Overwrite', value: 'overwrite' }, { label: 'Append', value: 'append' }], default: 'overwrite' },
    ],
  },
  {
    type: 'folder.patch',
    label: 'Folder Patch',
    description: 'Apply a string replacement to a file (AI-driven code edits).',
    category: 'storage',
    color: '#EA580C',
    icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    handles: {
      inputs: [{ id: 'in', label: 'Input', type: 'target' }],
      outputs: [
        { id: 'main', label: 'Result', type: 'source' },
        { id: 'error', label: 'Error', type: 'source' },
      ],
    },
    configSchema: [
      { key: 'folderPath', label: 'Folder Path (override)', type: 'text', placeholder: 'Leave blank to use upstream folderPath' },
      { key: 'filePath', label: 'File Path', type: 'text', required: true, placeholder: 'src/index.ts' },
      { key: 'oldStr', label: 'Old String', type: 'textarea', required: true, placeholder: 'Exact text to replace. Supports {{ input.oldStr }}.' },
      { key: 'newStr', label: 'New String', type: 'textarea', required: true, placeholder: 'Replacement text. Supports {{ input.newStr }}.' },
    ],
  },
);

export function getNodeMeta(type: string): NodeMeta | undefined {
  return NODE_REGISTRY.find(n => n.type === type);
}

export function getNodesByCategory(category: NodeMeta['category']): NodeMeta[] {
  return NODE_REGISTRY.filter(n => n.category === category);
}
