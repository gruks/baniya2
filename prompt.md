# BANIYA — Full From-Scratch Build Prompt

> Paste this entire prompt into Claude Code at an empty directory. It builds the complete Baniya project from zero — no n8n dependency, no third-party integrations. Pure AI pipeline engine with a Vue 3 canvas UI.

---

## PROJECT OVERVIEW

Build **Baniya** — a standalone AI workflow automation engine. Users visually connect AI nodes on a canvas to build pipelines. Each pipeline is a DAG (directed acyclic graph) of nodes that execute in sequence. Baniya automatically classifies data sensitivity on every node and routes each prompt to the right LLM — local models (Ollama, LM Studio) for private data, cloud models (OpenAI, Anthropic, Gemini) for public tasks. Every decision is logged with cost, latency, and proof.

**No integrations with Gmail, Slack, Notion, or any external SaaS.** This is a pure AI pipeline tool — inputs come from webhooks or manual triggers, outputs go to the next node or a final response. The power is in the AI routing layer, not the connector library.

**Stack:** Vue 3 + TypeScript (frontend), Node.js + Express (backend), PostgreSQL + TypeORM (persistence), pnpm workspaces (monorepo).

---

## MONOREPO STRUCTURE

Scaffold this exact structure at the root:

```
baniya/
├── package.json                  ← root pnpm workspace config
├── pnpm-workspace.yaml
├── tsconfig.base.json            ← shared TS config
├── .env.example
├── docker-compose.yml
├── README.md
│
├── packages/
│   ├── @baniya/types/            ← shared TypeScript interfaces
│   ├── @baniya/data-classifier/  ← PII detection engine
│   ├── @baniya/llm-router/       ← routing + provider adapters
│   ├── @baniya/audit-logger/     ← audit log writer + query API
│   ├── @baniya/workflow-engine/  ← DAG execution core
│   └── @baniya/nodes/            ← all node type definitions
│
├── apps/
│   ├── server/                   ← Express API + WebSocket server
│   └── editor/                   ← Vue 3 canvas frontend
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - 'packages/*'
  - 'packages/@baniya/*'
  - 'apps/*'
```

**Root `package.json`:**
```json
{
  "name": "baniya",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter @baniya/server dev\" \"pnpm --filter @baniya/editor dev\"",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter @baniya/server migration:run"
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

---

## PACKAGE 1 — `packages/@baniya/types`

Single source of truth for all shared interfaces. Every other package imports from here.

**`src/index.ts` — export everything:**

```typescript
export type SensitivityLevel = 'public' | 'internal' | 'private' | 'critical';
export type RoutingTarget = 'local' | 'hybrid' | 'cloud';
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';
export type NodeType =
  | 'trigger.manual'
  | 'trigger.webhook'
  | 'trigger.schedule'
  | 'ai.llm'
  | 'ai.classify'
  | 'ai.embed'
  | 'ai.summarise'
  | 'ai.extract'
  | 'ai.rewrite'
  | 'ai.translate'
  | 'ai.moderate'
  | 'logic.if'
  | 'logic.switch'
  | 'logic.merge'
  | 'logic.loop'
  | 'logic.wait'
  | 'data.set'
  | 'data.transform'
  | 'data.filter'
  | 'data.aggregate'
  | 'output.response'
  | 'output.log';

export interface Position { x: number; y: number; }

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: Position;
  config: Record<string, unknown>;
  disabled: boolean;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string;    // 'main' | 'true' | 'false' | 'error'
  targetNodeId: string;
  targetHandle: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationResult {
  level: SensitivityLevel;
  detectedPatterns: string[];
  confidence: number;
  routingRecommendation: RoutingTarget;
}

export interface LLMResponse {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  latencyMs: number;
  routing: RoutingTarget;
  sensitivity: SensitivityLevel;
  sanitizerApplied: boolean;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  output: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
  llmMeta?: Pick<LLMResponse, 'model' | 'costUSD' | 'latencyMs' | 'routing' | 'sensitivity'>;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  totalCostUSD: number;
  totalLatencyMs: number;
  nodeResults: NodeExecutionResult[];
  startedAt: string;
  finishedAt?: string;
}

export interface AuditRow {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sensitivityLevel: SensitivityLevel;
  detectedPatterns: string[];
  routingDecision: RoutingTarget;
  modelUsed: string;
  costUSD: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  sanitizerApplied: boolean;
  createdAt: string;
}

export interface CostSummary {
  totalCostUSD: number;
  totalCostINR: number;
  savingsVsAllCloudUSD: number;
  savingsPercent: number;
  byModel: Record<string, number>;
  byRoute: Record<RoutingTarget, number>;
  executionCount: number;
}

export interface ProviderStatus {
  ollama: boolean;
  lmstudio: boolean;
  openai: boolean;
  anthropic: boolean;
  gemini: boolean;
}
```

---

## PACKAGE 2 — `packages/@baniya/data-classifier`

Pure TypeScript rule engine. No external ML. Must complete in under 50ms for any payload under 100KB.

**`src/patterns/india-pii.ts`:**
```typescript
export const PATTERNS: Record<string, RegExp> = {
  aadhaar:      /\b[2-9]{1}[0-9]{11}\b/g,
  pan:          /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
  ifsc:         /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
  phone_IN:     /(\+91[\-\s]?)?[6-9]\d{9}\b/g,
  email:        /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
  bank_account: /\b\d{9,18}\b/g,
  passport_IN:  /\b[A-Z]{1}[0-9]{7}\b/g,
  dob:          /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-](19|20)\d{2}\b/g,
  credit_card:  /\b(?:\d[ \-]?){13,16}\b/g,
};

export const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
  'private_key', 'privatekey', 'ssn', 'dob', 'salary', 'medical',
  'diagnosis', 'prescription', 'aadhaar', 'pan', 'bank_account',
  'account_number', 'credit_card', 'cvv', 'otp',
];
```

**`src/classifier.ts`:**
```typescript
import { ClassificationResult, SensitivityLevel, RoutingTarget } from '@baniya/types';
import { PATTERNS, SENSITIVE_KEYS } from './patterns/india-pii';

const LEVEL_ORDER: SensitivityLevel[] = ['public', 'internal', 'private', 'critical'];

const PATTERN_LEVEL: Record<string, SensitivityLevel> = {
  aadhaar:      'critical',
  pan:          'critical',
  ifsc:         'critical',
  bank_account: 'critical',
  credit_card:  'critical',
  passport_IN:  'critical',
  phone_IN:     'private',
  email:        'private',
  dob:          'private',
};

const ROUTING_MAP: Record<SensitivityLevel, RoutingTarget> = {
  critical: 'local',
  private:  'local',
  internal: 'hybrid',
  public:   'cloud',
};

function maxLevel(a: SensitivityLevel, b: SensitivityLevel): SensitivityLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

function scanValue(value: unknown, found: Set<string>): SensitivityLevel {
  if (value === null || value === undefined) return 'public';
  if (typeof value === 'object') {
    return scanObject(value as Record<string, unknown>, found);
  }
  const str = String(value);
  let level: SensitivityLevel = 'public';
  for (const [name, regex] of Object.entries(PATTERNS)) {
    regex.lastIndex = 0;
    if (regex.test(str)) {
      found.add(name);
      level = maxLevel(level, PATTERN_LEVEL[name] ?? 'internal');
    }
  }
  return level;
}

function scanObject(obj: Record<string, unknown>, found: Set<string>): SensitivityLevel {
  let level: SensitivityLevel = 'public';
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      found.add(`key:${key}`);
      level = 'critical';
    }
    level = maxLevel(level, scanValue(val, found));
  }
  return level;
}

export function classify(payload: unknown): ClassificationResult {
  const found = new Set<string>();
  const level = typeof payload === 'object' && payload !== null
    ? scanObject(payload as Record<string, unknown>, found)
    : scanValue(payload, found);

  const patterns = [...found];
  const confidence = patterns.length === 0 ? 0.95 : Math.min(0.7 + patterns.length * 0.1, 0.99);

  return {
    level,
    detectedPatterns: patterns,
    confidence,
    routingRecommendation: ROUTING_MAP[level],
  };
}
```

**Tests at `src/__tests__/classifier.test.ts`:** Write tests for clean business text → public, email only → private, Aadhaar in nested field → critical, mixed payload → internal, key named `password` → critical regardless of value.

---

## PACKAGE 3 — `packages/@baniya/llm-router`

**File structure:**
```
src/
  router.ts
  sanitizer.ts
  cost-estimator.ts
  providers/
    local.ts
    cloud.ts
    hybrid.ts
  errors.ts
  index.ts
```

**`src/cost-estimator.ts`:**
```typescript
export const PRICE_PER_1K: Record<string, { in: number; out: number }> = {
  'gpt-4o':             { in: 0.005,   out: 0.015   },
  'gpt-4o-mini':        { in: 0.00015, out: 0.0006  },
  'claude-sonnet-4-6':  { in: 0.003,   out: 0.015   },
  'claude-haiku-4-5':   { in: 0.00025, out: 0.00125 },
  'gemini-1.5-flash':   { in: 0.000075,out: 0.0003  },
  'gemini-1.5-pro':     { in: 0.00125, out: 0.005   },
  'ollama/*':           { in: 0,       out: 0        },
  'lmstudio/*':         { in: 0,       out: 0        },
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const key = Object.keys(PRICE_PER_1K).find(k =>
    k.endsWith('/*') ? model.startsWith(k.replace('/*','')) : model === k
  ) ?? 'gpt-4o-mini';
  const p = PRICE_PER_1K[key];
  return (tokensIn / 1000) * p.in + (tokensOut / 1000) * p.out;
}
```

**`src/providers/local.ts`:**
- Detect Ollama: `GET http://localhost:11434/` — if 200, use Ollama
- Detect LM Studio: `GET http://localhost:1234/v1/models` — if 200, use LM Studio
- Cache detection result for 30 seconds
- Ollama call: `POST /api/generate` with `{ model, prompt, stream: false }`
- LM Studio call: `POST /v1/chat/completions` (OpenAI-compatible)
- 30-second timeout on all calls
- Throw `LocalProviderUnavailableError` with message: "No local model is running. Start Ollama (`ollama serve`) or LM Studio, or change this node's route override to 'cloud'."

**`src/providers/cloud.ts`:**
- Read `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` from env
- Model selection: pick cheapest available model based on which keys are set. Priority: gemini-1.5-flash → gpt-4o-mini → claude-haiku-4-5
- Normalize all responses to `LLMResponse`
- 60-second timeout

**`src/sanitizer.ts`:**
- Replace each detected PII value with `[PATTERN_INDEX]` e.g. `[EMAIL_1]`, `[AADHAAR_1]`
- Store original → placeholder map in `Map<requestId, Map<placeholder, original>>`
- `sanitize(requestId, text, patterns)` → sanitized text
- `restore(requestId, text)` → text with originals re-injected
- `clear(requestId)` → delete map entry after restore
- Never log or persist original values

**`src/router.ts`:**
```typescript
export class BaniyaRouter {
  async route(payload: unknown, prompt: string, config: RouterConfig): Promise<LLMResponse> {
    const classification = classify(payload);
    const target = this.resolveTarget(classification, config);

    // Hard block: critical data cannot go to cloud even if overridden
    if (classification.level === 'critical' && target === 'cloud') {
      throw new HardBlockError('Critical data cannot be routed to cloud. Set BANIYA_BLOCK_CLOUD_FOR=critical.');
    }

    const start = Date.now();
    let response: LLMResponse;

    if (target === 'local')  response = await callLocal(prompt, config);
    else if (target === 'hybrid') response = await callHybrid(payload, prompt, config);
    else response = await callCloud(prompt, config);

    response.latencyMs = Date.now() - start;
    response.costUSD = estimateCost(response.model, response.tokensIn, response.tokensOut);
    response.routing = target;
    response.sensitivity = classification.level;

    return response;
  }

  private resolveTarget(c: ClassificationResult, config: RouterConfig): RoutingTarget {
    if (config.forceRoute && config.forceRoute !== 'auto') return config.forceRoute;
    return c.routingRecommendation;
  }
}
```

---

## PACKAGE 4 — `packages/@baniya/audit-logger`

**TypeORM Entity (`src/entities/AuditLog.ts`):**
```typescript
@Entity('baniya_audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() workflowId: string;
  @Column() executionId: string;
  @Column() nodeId: string;
  @Column({ type: 'varchar' }) sensitivityLevel: string;
  @Column({ type: 'simple-array' }) detectedPatterns: string[];
  @Column() routingDecision: string;
  @Column() modelUsed: string;
  @Column({ type: 'float', default: 0 }) costUSD: number;
  @Column({ type: 'int', default: 0 }) latencyMs: number;
  @Column({ type: 'int', default: 0 }) tokensIn: number;
  @Column({ type: 'int', default: 0 }) tokensOut: number;
  @Column({ default: false }) sanitizerApplied: boolean;
  @CreateDateColumn() createdAt: Date;
}
```

**`src/audit-logger.ts`:**
```typescript
export class AuditLogger {
  async write(entry: Omit<AuditRow, 'id' | 'createdAt'>): Promise<void>
  async getCostSummary(workflowId: string, days: number): Promise<CostSummary>
  async getRows(opts: { workflowId?: string; sensitivity?: string; page: number; limit: number }): Promise<{ rows: AuditRow[]; total: number }>
}
```

For `getCostSummary`: compute `savingsVsAllCloudUSD` by summing what each local/hybrid call would have cost on `gpt-4o-mini` and subtracting actual cost. Fetch INR rate from `https://api.exchangerate-api.com/v4/latest/USD`, cache 1 hour.

---

## PACKAGE 5 — `packages/@baniya/workflow-engine`

The DAG execution core. No n8n dependency — built from scratch.

**`src/engine.ts`:**
```typescript
export class WorkflowEngine {
  async execute(workflow: Workflow, trigger: TriggerPayload): Promise<ExecutionSummary>
  async executeNode(node: WorkflowNode, input: unknown, context: ExecutionContext): Promise<NodeExecutionResult>
  private resolveExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[][]
  private getNodeHandler(type: NodeType): NodeHandler
}
```

**Execution model:**
- Topological sort the DAG — nodes with no incoming edges execute first
- Nodes in the same topological tier execute in parallel (`Promise.all`)
- Each node receives the merged output of all its upstream nodes as `input`
- On node error: mark node as 'error', propagate error output down 'error' handles, continue other paths
- Emit WebSocket events on every state change: `execution:started`, `node:running`, `node:done`, `node:error`, `execution:done`

**`src/nodes/` — one handler file per node type:**

```
trigger.manual.ts    ← returns the manually provided payload as-is
trigger.webhook.ts   ← stores incoming webhook data, resolves on receipt
trigger.schedule.ts  ← cron-based, emits at the configured interval
ai.llm.ts            ← calls BaniyaRouter, returns LLMResponse
ai.classify.ts       ← runs data-classifier only, emits on 'private' or 'public' handle
ai.embed.ts          ← calls local or cloud embedding model, returns vector
ai.summarise.ts      ← preset prompt: "Summarise the following: {input}"
ai.extract.ts        ← preset prompt: "Extract {fields} from: {input}"
ai.rewrite.ts        ← preset prompt: "Rewrite in {tone}: {input}"
ai.translate.ts      ← preset prompt: "Translate to {language}: {input}"
ai.moderate.ts       ← calls moderation endpoint, flags unsafe content
logic.if.ts          ← evaluates a JS expression, routes to 'true' or 'false' handle
logic.switch.ts      ← evaluates expression against N cases, routes to matching handle
logic.merge.ts       ← waits for all incoming branches, merges their outputs
logic.loop.ts        ← iterates over array input, runs downstream for each item
logic.wait.ts        ← pauses execution for N seconds
data.set.ts          ← sets key-value pairs on the data object
data.transform.ts    ← runs a user-defined JS expression over the data
data.filter.ts       ← filters array data by expression
data.aggregate.ts    ← groups, counts, sums array data
output.response.ts   ← sends HTTP response (for webhook-triggered workflows)
output.log.ts        ← writes to execution log only, no side effects
```

Each handler implements:
```typescript
interface NodeHandler {
  execute(input: unknown, config: Record<string, unknown>, context: ExecutionContext): Promise<{ main?: unknown; true?: unknown; false?: unknown; error?: unknown }>
}
```

---

## PACKAGE 6 — `packages/@baniya/nodes`

Node metadata registry — display names, icons (SVG path strings), config schemas, handle definitions.

**`src/registry.ts`:**
```typescript
export interface NodeMeta {
  type: NodeType;
  label: string;
  description: string;
  category: 'trigger' | 'ai' | 'logic' | 'data' | 'output';
  color: string;           // hex, used for node header in canvas
  icon: string;            // inline SVG path d= value
  handles: {
    inputs: Handle[];
    outputs: Handle[];
  };
  configSchema: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'code' | 'expression';
  default?: unknown;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  description?: string;
}
```

**Node colour scheme:**
- Triggers: `#6366F1` (indigo)
- AI nodes: `#0D9E75` (Baniya teal)
- Logic nodes: `#F59E0B` (amber)
- Data nodes: `#8B5CF6` (purple)
- Output nodes: `#64748B` (slate)

**Config schemas for key AI nodes:**

`ai.llm` config fields:
- `prompt` (textarea, required) — supports `{{ input.fieldName }}` expression syntax
- `systemPrompt` (textarea) — system message
- `forceRoute` (select: auto | local | hybrid | cloud, default: auto)
- `preferredLocalModel` (text, default: llama3.2)
- `preferredCloudModel` (select: gpt-4o | gpt-4o-mini | claude-sonnet-4-6 | claude-haiku-4-5 | gemini-1.5-flash | gemini-1.5-pro)
- `maxTokens` (number, default: 1000)
- `temperature` (number 0–1, default: 0.7)

`logic.if` config fields:
- `expression` (code, required) — JS expression returning boolean, `input` available as variable
- Example: `input.sentiment === 'negative'`

`data.transform` config fields:
- `expression` (code, required) — JS expression, `input` available, must return the transformed value

---

## APP 1 — `apps/server`

Express.js API server + WebSocket.

**`src/index.ts` — server bootstrap:**
```typescript
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: process.env.EDITOR_URL ?? 'http://localhost:5173' }));
app.use('/api', jwtMiddleware);
app.use('/api/workflows', workflowRouter);
app.use('/api/executions', executionRouter);
app.use('/api/baniya', baniyaRouter);
app.use('/api/auth', authRouter);
app.use('/webhooks', webhookRouter);   // no JWT — public endpoint

const server = createServer(app);
const wss = new WebSocketServer({ server });
// attach execution engine event emitter to WebSocket broadcaster
```

**REST API — full route list:**

Auth:
```
POST /api/auth/login         body: { email, password } → { token }
POST /api/auth/register      body: { email, password, name } → { token }
GET  /api/auth/me            → current user
```

Workflows:
```
GET    /api/workflows              → list all workflows
POST   /api/workflows              → create workflow
GET    /api/workflows/:id          → get workflow with nodes and edges
PUT    /api/workflows/:id          → update workflow (full replace)
PATCH  /api/workflows/:id/active   → toggle active/inactive
DELETE /api/workflows/:id          → delete workflow
POST   /api/workflows/:id/execute  → manual trigger execution
```

Executions:
```
GET  /api/executions                         → list executions (paginated)
GET  /api/executions/:id                     → get full execution with node results
GET  /api/executions?workflowId=:wid         → executions for a workflow
DELETE /api/executions/:id                   → delete execution record
```

Baniya:
```
GET  /api/baniya/cost-summary           → CostSummary (query: workflowId?, days?)
GET  /api/baniya/audit                  → paginated audit rows (query: workflowId?, sensitivity?, page, limit)
GET  /api/baniya/providers/status       → ProviderStatus
POST /api/baniya/classify               → body: { payload } → ClassificationResult
POST /api/baniya/route                  → body: { payload, prompt, config } → LLMResponse
GET  /api/baniya/models/local           → list running Ollama models
```

Webhooks (no auth):
```
POST /webhooks/:workflowId/:nodeId     → triggers a webhook-triggered workflow
GET  /webhooks/:workflowId/:nodeId     → same, for GET triggers
```

**WebSocket events (server → client):**
```typescript
{ type: 'execution:started',  executionId: string, workflowId: string }
{ type: 'node:running',       executionId: string, nodeId: string }
{ type: 'node:done',          executionId: string, nodeId: string, result: NodeExecutionResult }
{ type: 'node:error',         executionId: string, nodeId: string, error: string }
{ type: 'execution:done',     executionId: string, summary: ExecutionSummary }
{ type: 'providers:status',   status: ProviderStatus }
```

**Database entities (TypeORM):**
```
User              id, email (unique), passwordHash, name, createdAt
Workflow          id, name, description, definition (jsonb), active, userId, createdAt, updatedAt
Execution         id, workflowId, status, nodeResults (jsonb), totalCostUSD, startedAt, finishedAt
AuditLog          (see @baniya/audit-logger)
```

**JWT middleware:** Read `Authorization: Bearer <token>`, verify with `JWT_SECRET` env var, attach `req.user`. Reject with 401 if missing or invalid.

**Password hashing:** bcrypt, 12 rounds.

---

## APP 2 — `apps/editor` (Vue 3 frontend)

**`package.json` deps:**
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "@vueuse/core": "^10.9.0",
    "chart.js": "^4.4.0",
    "@vue-flow/core": "^1.41.0",
    "@vue-flow/background": "^1.3.0",
    "@vue-flow/controls": "^1.1.0",
    "@vue-flow/minimap": "^1.5.0",
    "axios": "^1.6.0",
    "date-fns": "^3.6.0"
  }
}
```

**Use `@vue-flow/core` for the canvas.** This is a Vue 3 port of React Flow — it handles node dragging, edge drawing, zooming, panning, and selection out of the box. Do not build a custom canvas from scratch.

**`src/` structure:**
```
src/
  main.ts
  App.vue
  router/
    index.ts
  stores/
    auth.ts
    workflows.ts
    executions.ts
    canvas.ts
    providers.ts
  views/
    Login.vue
    Register.vue
    WorkflowList.vue
    WorkflowEditor.vue      ← main canvas view
    ExecutionDetail.vue
    BaniyaDashboard.vue
    Settings.vue
  components/
    canvas/
      BaniyaNode.vue         ← custom node renderer for vue-flow
      NodeConfigPanel.vue    ← right-side config drawer
      NodePicker.vue         ← left sidebar node palette
      EdgeLabel.vue
      MiniExecutionBadge.vue ← shows cost/status on node during execution
    dashboard/
      CostCard.vue
      SavingsCard.vue
      RoutingPie.vue
      AuditTable.vue
      ProviderStatus.vue
    shared/
      AppSidebar.vue
      Topbar.vue
      Modal.vue
      Badge.vue
      Spinner.vue
      EmptyState.vue
  composables/
    useWebSocket.ts
    useExecution.ts
    useNodeConfig.ts
  api/
    client.ts               ← axios instance with JWT interceptor
    workflows.ts
    executions.ts
    baniya.ts
    auth.ts
```

**Router (`src/router/index.ts`):**
```typescript
const routes = [
  { path: '/login',          component: Login,          meta: { public: true } },
  { path: '/register',       component: Register,       meta: { public: true } },
  { path: '/',               redirect: '/workflows' },
  { path: '/workflows',      component: WorkflowList,   meta: { auth: true } },
  { path: '/workflows/:id',  component: WorkflowEditor, meta: { auth: true } },
  { path: '/executions/:id', component: ExecutionDetail,meta: { auth: true } },
  { path: '/dashboard',      component: BaniyaDashboard,meta: { auth: true } },
  { path: '/settings',       component: Settings,       meta: { auth: true } },
];
```

Guard: if `meta.auth` and no token in localStorage → redirect to `/login`.

---

### CANVAS — `WorkflowEditor.vue`

The main view. Three panels:

**Left panel (280px) — Node Picker:**
- Search box at top
- Nodes grouped by category: Triggers, AI, Logic, Data, Output
- Each node shown as a small card with colour-coded left border, icon, and name
- Drag a node card onto the canvas to add it (use vue-flow's `onDrop` handler)
- Node palette is built from the `@baniya/nodes` registry

**Centre — Canvas (`<VueFlow>`):**
- Background: dot grid pattern (use `<Background>` component from `@vue-flow/background`)
- Controls: zoom in/out/fit (use `<Controls>` from `@vue-flow/controls`)
- Mini-map bottom-right (use `<MiniMap>` from `@vue-flow/minimap`)
- Custom node renderer `BaniyaNode.vue` for all node types:
  - Header: coloured bar with icon + node label
  - Body: shows key config values as read-only preview (first 2 fields only)
  - Handles: input handle on left, output handles on right (labelled for multi-output nodes)
  - Status ring: idle=gray, running=pulsing blue, success=green, error=red
  - Cost badge: appears bottom-right after execution — shows "$0.00" or "free"
- Click a node → opens NodeConfigPanel on the right
- Double-click node label → inline rename
- Delete key → deletes selected nodes/edges
- Canvas toolbar (top): Run button, Save button, workflow name (editable), active toggle

**Right panel (320px, slides in) — Node Config Panel:**
- Shows all `configSchema` fields for the selected node type
- Field types:
  - `text` → `<input>`
  - `textarea` → `<textarea>` (auto-resize)
  - `number` → `<input type="number">` with min/max
  - `boolean` → toggle switch
  - `select` → `<select>` with options
  - `code` → Monaco editor (load from CDN: `https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js`) with JS syntax highlighting
  - `expression` → single-line input with `{{ }}` syntax hint and autocomplete for `input.*` fields
- Changes apply immediately to the workflow store (not saved until Save is pressed)
- Close button top-right

**Execution state overlay:**
- When an execution is running, each node shows its live status via WebSocket updates
- Running node: pulsing blue ring + spinner icon
- Done node: green ring + checkmark + cost badge appears
- Error node: red ring + X icon + error tooltip on hover
- Execution log panel slides up from the bottom: shows each node result in order with timestamps

---

### DASHBOARD — `BaniyaDashboard.vue`

**Layout: full-width, three sections stacked vertically.**

**Section 1 — Summary cards (4 cards in a row):**
- Total spend this month: `₹ X.XX ($Y.YY)`
- If all cloud: `₹ X.XX ($Y.YY)`
- Baniya saved: `₹ X.XX (Z%)`
- Total executions: `N`

**Section 2 — Two charts side by side:**
- Left: Donut chart (Chart.js) — routing breakdown: % local / hybrid / cloud
- Right: Bar chart — daily spend over the last 30 days, stacked by route

**Section 3 — Audit log table:**
- Columns: Time | Workflow | Node | Sensitivity | Route | Model | Cost | Latency
- Sensitivity shown as a coloured badge: critical=red, private=amber, internal=blue, public=green
- Route shown as coloured pill: local=green, hybrid=amber, cloud=blue
- Sortable by any column
- Filter bar: sensitivity dropdown, workflow dropdown, date range
- Pagination: 20 rows/page

**Section 4 — Provider status bar (always visible at top of dashboard):**
```
Ollama  ● running     LM Studio  ● offline     OpenAI  ● configured     Anthropic  ● configured     Gemini  ● missing key
```
Polls `/api/baniya/providers/status` every 10 seconds.

---

### WORKFLOW LIST — `WorkflowList.vue`

- Grid of workflow cards (3 columns)
- Each card: name, description, active badge, last executed time, execution count, quick-run button
- Top bar: search, "New workflow" button (creates blank workflow and navigates to editor)
- New workflow dialog: name + description fields
- Empty state: illustration + "Create your first workflow" button

---

### SIDEBAR — `AppSidebar.vue`

Left navigation, 56px wide (icons only) with tooltip labels on hover. Items:
```
[coin icon]    Baniya (logo / home)
[grid icon]    Workflows
[bar icon]     Dashboard
[clock icon]   Executions
[gear icon]    Settings
```

Active item highlighted with teal background. All icons are inline SVG paths — no icon library dependency.

---

## DESIGN SYSTEM

Do not use a component library (no Vuetify, no Element Plus, no PrimeVue). All components are hand-built with these tokens:

**Colour palette:**
```css
:root {
  --color-brand:          #0D9E75;
  --color-brand-dark:     #0A7A5C;
  --color-brand-light:    #E1F5EE;

  --color-bg-primary:     #FFFFFF;
  --color-bg-secondary:   #F8F9FA;
  --color-bg-tertiary:    #F1F3F5;

  --color-text-primary:   #1A1A1A;
  --color-text-secondary: #6B7280;
  --color-text-muted:     #9CA3AF;

  --color-border:         rgba(0,0,0,0.08);
  --color-border-strong:  rgba(0,0,0,0.16);

  --color-success:        #10B981;
  --color-warning:        #F59E0B;
  --color-error:          #EF4444;
  --color-info:           #3B82F6;

  --radius-sm:    4px;
  --radius-md:    8px;
  --radius-lg:    12px;
  --radius-full:  9999px;

  --shadow-sm:    0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:    0 4px 6px rgba(0,0,0,0.07);
}
```

**Dark mode** (class `.dark` on `<html>`):
```css
.dark {
  --color-bg-primary:     #111827;
  --color-bg-secondary:   #1F2937;
  --color-bg-tertiary:    #374151;
  --color-text-primary:   #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-border:         rgba(255,255,255,0.08);
  --color-border-strong:  rgba(255,255,255,0.16);
}
```

Dark mode toggle in Settings. Persisted to localStorage.

**Typography:**
- Font: system-ui stack — `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Base: 14px / 1.6
- Headings: 500 weight only (no 700)
- Monospace (code fields): `'JetBrains Mono', 'Fira Code', monospace`

**Node category colours (left border on palette cards, node header):**
```
Triggers:  #6366F1  (indigo)
AI nodes:  #0D9E75  (teal)
Logic:     #F59E0B  (amber)
Data:      #8B5CF6  (purple)
Output:    #64748B  (slate)
```

---

## ENVIRONMENT VARIABLES

**`apps/server/.env.example`:**
```env
# Server
PORT=3000
EDITOR_URL=http://localhost:5173
JWT_SECRET=change-me-in-production
NODE_ENV=development

# Database
DATABASE_URL=postgresql://baniya:baniya@localhost:5432/baniya

# Local providers
BANIYA_OLLAMA_URL=http://localhost:11434
BANIYA_LMSTUDIO_URL=http://localhost:1234

# Cloud providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Routing policy
BANIYA_DEFAULT_ROUTE=auto
BANIYA_BLOCK_CLOUD_FOR=critical
BANIYA_COST_ALERT_USD=5.00

# Audit
BANIYA_AUDIT_ENABLED=true
BANIYA_AUDIT_RETENTION_DAYS=90
```

**`apps/editor/.env.example`:**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## DOCKER SETUP

**`docker-compose.yml`:**
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: baniya
      POSTGRES_PASSWORD: baniya
      POSTGRES_DB: baniya
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://baniya:baniya@postgres:5432/baniya
    env_file: apps/server/.env
    depends_on:
      - postgres

  editor:
    build:
      context: .
      dockerfile: apps/editor/Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - server

volumes:
  postgres_data:
```

---

## IMPLEMENTATION ORDER

Execute in this sequence. Each phase must build and pass tests before proceeding.

**Phase 1 — Scaffold (Day 1 morning)**
1. Create monorepo structure, `pnpm-workspace.yaml`, root `package.json`
2. Create `@baniya/types` with all interfaces — this is imported by everything else
3. Set up shared `tsconfig.base.json` with strict mode, path aliases
4. Verify: `pnpm -r build` passes with no errors

**Phase 2 — Intelligence (Day 1 afternoon)**
5. Build `@baniya/data-classifier` with all patterns and tests
6. Build `@baniya/llm-router` — providers, sanitizer, cost estimator, router
7. Write integration tests: mock Ollama endpoint, verify routing decisions
8. Verify: classifier tests pass, router dispatches to correct provider

**Phase 3 — Engine (Day 1 evening)**
9. Build `@baniya/workflow-engine` — DAG sorter, node dispatcher, all node handlers
10. Build `@baniya/nodes` — registry with metadata for all 20 node types
11. Build `@baniya/audit-logger` — entity, migration, write + query methods
12. Verify: execute a simple 3-node workflow programmatically in a test

**Phase 4 — Server (Day 2 morning)**
13. Scaffold `apps/server` with Express, TypeORM connection, JWT middleware
14. Run database migration — verify tables exist
15. Implement all REST routes with Zod validation
16. Implement WebSocket broadcaster hooked to engine events
17. Verify: `curl` all endpoints, check auth gates work

**Phase 5 — Editor (Day 2 afternoon)**
18. Scaffold `apps/editor` with Vite + Vue 3 + vue-router + Pinia
19. Build the design system CSS tokens and shared components (Sidebar, Topbar, Modal, Badge)
20. Build WorkflowList view and API integration
21. Build WorkflowEditor — vue-flow canvas, BaniyaNode renderer, NodePicker
22. Build NodeConfigPanel with all field types including Monaco editor
23. Connect WebSocket for live execution status on canvas
24. Verify: create a workflow, drag nodes, connect them, save, manually trigger, watch status update live

**Phase 6 — Dashboard + Polish (Day 2 evening)**
25. Build BaniyaDashboard — cost cards, charts, audit table, provider status
26. Build ExecutionDetail view — full node result timeline
27. Build Settings view — dark mode toggle, API key status
28. End-to-end test: full pipeline with classify → branch → local LLM → cloud LLM → merge → response
29. Verify: audit log populates, cost summary calculates correctly, savings shown on dashboard

---

## DEMO WORKFLOW (pre-built, importable on first run)

Seed this workflow into the database on first server startup if no workflows exist:

```
[Manual Trigger]
      ↓
[Baniya Classify]
      ↓ private          ↓ public
[Local LLM]         [Cloud LLM]
"Summarise this     "Summarise this
 privately"          concisely"
      ↓                   ↓
         [Merge]
            ↓
[Data: Set]   (adds routing_used and cost_usd to output)
            ↓
[Output: Response]
```

This workflow demonstrates the entire Baniya value proposition in 30 seconds — classify, branch by sensitivity, route differently, merge, respond, audit.

---

## CRITICAL CONSTRAINTS

- Never write original PII values to any log, database column, or file
- The data classifier must run in under 50ms on payloads under 100KB
- All money displayed in both ₹ INR and $ USD
- Critical-level data cannot be force-routed to cloud (hard block in router)
- Local provider calls: 30-second timeout. Cloud calls: 60-second timeout
- All API routes (except `/api/auth/*` and `/webhooks/*`) require valid JWT
- All new API routes must have Zod input validation
- Dark mode must work across all views
- The canvas must support workflows with at least 50 nodes without performance degradation
- WebSocket must reconnect automatically on disconnect (exponential backoff, max 30s)
- All node config values must be sanitized before being used in prompt templates (prevent prompt injection via `{{ }}` expressions)

---

*End of prompt. Start with Phase 1. The project is complete when the demo workflow runs end-to-end, the audit log populates, and the dashboard shows accurate cost savings.*