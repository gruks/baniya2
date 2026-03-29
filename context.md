# BANIYA — Complete AI Context Document

> This file is the single source of truth the AI needs to build Baniya from scratch.
> Feed this entire file as context before starting any code generation.

---

## 1. WHAT IS BANIYA

Baniya is a visual AI pipeline builder. Users drag nodes onto a canvas, connect them with edges, and run workflows. The core differentiator is automatic data sensitivity classification — before every LLM call, Baniya reads the payload, detects PII, and routes the prompt to the cheapest model that is legally allowed to see that data. Private data stays local. Public data goes cloud. Every decision is logged.

**It is not:**
- An integration platform (no Gmail, Slack, Notion, Airtable connectors)
- A clone of n8n (same canvas UX philosophy, completely different codebase)
- A chatbot (it is a workflow engine for AI pipelines)

**It is:**
- A DAG-based workflow executor
- A data sensitivity classifier
- A multi-provider LLM router
- A cost and compliance audit tool

---

## 2. NAME AND BRANDING

- **Project name:** Baniya
- **Tagline:** Shrewd routing. Zero waste. Your data stays where it belongs.
- **Primary colour:** `#0D9E75` (teal)
- **Logo:** lowercase "baniya" with a ₹ coin icon to the left
- **Name origin:** The Baniya community built India's trading economy on extracting maximum value at minimum cost — exactly what this router does with LLM spend

---

## 3. MONOREPO STRUCTURE

```
baniya/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── docker-compose.yml
├── README.md
├── packages/
│   ├── @baniya/types/            ← shared TypeScript interfaces (no deps)
│   ├── @baniya/data-classifier/  ← PII detection engine
│   ├── @baniya/llm-router/       ← routing + provider adapters
│   ├── @baniya/audit-logger/     ← audit log writer + query API
│   ├── @baniya/workflow-engine/  ← DAG execution core
│   └── @baniya/nodes/            ← node type registry + metadata
└── apps/
    ├── server/                   ← Express API + WebSocket
    └── editor/                   ← Vue 3 canvas frontend
```

**Package manager:** pnpm workspaces  
**Language:** TypeScript strict mode throughout  
**Testing:** Vitest  
**Linting:** ESLint + Prettier  

---

## 4. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite, Pinia, Vue Router |
| Canvas | @vue-flow/core (do NOT build custom drag-drop) |
| Charts | Chart.js |
| Backend | Node.js, Express.js, TypeScript |
| Auth | JWT (jsonwebtoken), bcrypt |
| Validation | Zod on all API routes |
| Real-time | WebSocket (ws package) |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| Local LLMs | Ollama REST API, LM Studio OpenAI-compatible API |
| Cloud LLMs | openai SDK, @anthropic-ai/sdk, @google/generative-ai |
| Monorepo | pnpm workspaces |
| Containers | Docker, docker-compose |

---

## 5. ALL SHARED TYPES (`@baniya/types`)

Every other package imports from here. No circular dependencies allowed.

```typescript
// Sensitivity levels (ordered low → high)
export type SensitivityLevel = 'public' | 'internal' | 'private' | 'critical';

// Where to route the LLM call
export type RoutingTarget = 'local' | 'hybrid' | 'cloud';

// Node execution state
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

// All node types available in the system
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
  sourceHandle: string;   // 'main' | 'true' | 'false' | 'error'
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

export interface TriggerPayload {
  source: 'manual' | 'webhook' | 'schedule';
  data: Record<string, unknown>;
  triggeredAt: string;
}

export interface RouterConfig {
  forceRoute?: 'auto' | RoutingTarget;
  preferredLocalModel?: string;
  preferredCloudModel?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

---

## 6. DATA CLASSIFIER — Rules and Patterns

**File:** `packages/@baniya/data-classifier/src/patterns/india-pii.ts`

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
  'password','passwd','secret','token','api_key','apikey',
  'private_key','privatekey','ssn','dob','salary','medical',
  'diagnosis','prescription','aadhaar','pan','bank_account',
  'account_number','credit_card','cvv','otp',
];
```

**Sensitivity mapping:**

| Pattern | Level | Routing |
|---|---|---|
| aadhaar, pan, ifsc, bank_account, credit_card | critical | local (forced, hard block) |
| phone_IN, email, dob, passport_IN | private | local |
| Mixed PII + business text | internal | hybrid |
| Business text, no PII | public | cloud |
| Key name in SENSITIVE_KEYS | critical | local |

**Classifier logic:**
- Scan recursively through nested objects
- Take the highest sensitivity level found anywhere in the tree
- Confidence: 0.95 if no patterns, min(0.7 + patterns.length × 0.1, 0.99) otherwise
- Must complete in under 50ms for payloads under 100KB

---

## 7. LLM ROUTER — Routing Logic

**Three paths:**

**Local path** (critical / private data):
- Try Ollama first: `GET http://localhost:11434/` health check
- Fallback to LM Studio: `GET http://localhost:1234/v1/models`
- Cache availability for 30 seconds
- Timeout: 30 seconds
- On unavailable: throw `LocalProviderUnavailableError` — never silently fall back to cloud

**Hybrid path** (internal / mixed data):
- Sanitizer replaces PII with typed placeholders: `[EMAIL_1]`, `[AADHAAR_1]`
- Placeholder-to-original map stored in memory keyed by `requestId`
- Send sanitized payload to cloud
- Re-inject originals into response text
- Clear memory map after re-injection
- Never write originals to disk or logs

**Cloud path** (public data):
- Pick cheapest available model based on which API keys are set
- Priority: gemini-1.5-flash → gpt-4o-mini → claude-haiku-4-5
- Timeout: 60 seconds

**Hard block rule:**
```
if (classification.level === 'critical' && target === 'cloud') → throw HardBlockError
```
This cannot be overridden by user config. `BANIYA_BLOCK_CLOUD_FOR=critical` in env.

**Token price table:**
```
gpt-4o:            $0.005 in / $0.015 out (per 1K tokens)
gpt-4o-mini:       $0.00015 in / $0.0006 out
claude-sonnet-4-6: $0.003 in / $0.015 out
claude-haiku-4-5:  $0.00025 in / $0.00125 out
gemini-1.5-flash:  $0.000075 in / $0.0003 out
gemini-1.5-pro:    $0.00125 in / $0.005 out
ollama/*:          $0 / $0
lmstudio/*:        $0 / $0
```

---

## 8. WORKFLOW ENGINE — Execution Model

**DAG execution:**
1. Topological sort nodes (Kahn's algorithm)
2. Nodes in the same tier execute in parallel (`Promise.all`)
3. Each node receives merged output of all upstream nodes as `input`
4. On error: mark node as 'error', continue other branches
5. Emit WebSocket events on every state change

**WebSocket events (server → client):**
```
execution:started  { executionId, workflowId }
node:running       { executionId, nodeId }
node:done          { executionId, nodeId, result: NodeExecutionResult }
node:error         { executionId, nodeId, error: string }
execution:done     { executionId, summary: ExecutionSummary }
providers:status   { status: ProviderStatus }
```

**Node handler interface:**
```typescript
interface NodeHandler {
  execute(
    input: unknown,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<{
    main?: unknown;
    true?: unknown;
    false?: unknown;
    error?: unknown;
  }>
}
```

**All 20 node types and their behaviour:**

| Node | Behaviour |
|---|---|
| trigger.manual | Returns manually provided payload |
| trigger.webhook | Waits for HTTP POST to `/webhooks/:workflowId/:nodeId` |
| trigger.schedule | Fires on cron expression |
| ai.llm | Calls BaniyaRouter — classifies, routes, returns LLMResponse |
| ai.classify | Runs classifier only, emits on 'private' or 'public' output handle |
| ai.embed | Returns embedding vector from local or cloud model |
| ai.summarise | Preset prompt: "Summarise the following: {input}" |
| ai.extract | Preset prompt: "Extract {fields} from: {input}" |
| ai.rewrite | Preset prompt: "Rewrite in {tone}: {input}" |
| ai.translate | Preset prompt: "Translate to {language}: {input}" |
| ai.moderate | Calls moderation endpoint, flags unsafe content |
| logic.if | Evaluates JS expression, routes to 'true' or 'false' handle |
| logic.switch | Evaluates against N cases, routes to matching handle |
| logic.merge | Waits for all incoming branches, merges outputs |
| logic.loop | Iterates array input, runs downstream per item |
| logic.wait | Pauses for N seconds |
| data.set | Sets key-value pairs on data object |
| data.transform | Runs user-defined JS expression over data |
| data.filter | Filters array by expression |
| data.aggregate | Groups/counts/sums array data |
| output.response | Sends HTTP response (webhook-triggered workflows) |
| output.log | Writes to execution log only |

---

## 9. DATABASE SCHEMA

**Tables:**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  definition JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executions
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'running',
  node_results JSONB DEFAULT '[]',
  total_cost_usd FLOAT DEFAULT 0,
  total_latency_ms INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Audit log (append-only, never update or delete)
CREATE TABLE baniya_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL,
  execution_id VARCHAR NOT NULL,
  node_id VARCHAR NOT NULL,
  sensitivity_level VARCHAR NOT NULL,
  detected_patterns TEXT[] DEFAULT '{}',
  routing_decision VARCHAR NOT NULL,
  model_used VARCHAR NOT NULL,
  cost_usd FLOAT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  sanitizer_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. REST API — Full Route List

**Base URL:** `http://localhost:3000`  
**Auth:** All routes except `/api/auth/*` and `/webhooks/*` require `Authorization: Bearer <token>`

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PUT    /api/workflows/:id
PATCH  /api/workflows/:id/active
DELETE /api/workflows/:id
POST   /api/workflows/:id/execute

GET    /api/executions
GET    /api/executions/:id

GET    /api/baniya/cost-summary         ?workflowId= &days=
GET    /api/baniya/audit                ?workflowId= &sensitivity= &page= &limit=
GET    /api/baniya/providers/status
POST   /api/baniya/classify             body: { payload }
POST   /api/baniya/route                body: { payload, prompt, config }
GET    /api/baniya/models/local

POST   /webhooks/:workflowId/:nodeId    (no auth)
GET    /webhooks/:workflowId/:nodeId    (no auth)
```

---

## 11. NODE REGISTRY — Config Schemas

Every node type has a metadata entry defining its display and config fields.

**Field types:**
- `text` → `<input type="text">`
- `textarea` → `<textarea>` auto-resize
- `number` → `<input type="number">` with min/max
- `boolean` → toggle switch
- `select` → `<select>` with options array
- `code` → Monaco editor (JS, loaded from CDN)
- `expression` → single-line with `{{ }}` syntax, autocomplete `input.*`

**Node colours:**
```
Triggers:  #6366F1
AI nodes:  #0D9E75
Logic:     #F59E0B
Data:      #8B5CF6
Output:    #64748B
```

**`ai.llm` config schema:**
```
prompt            textarea   required   "Your prompt here. Use {{ input.field }} for data"
systemPrompt      textarea   optional
forceRoute        select     auto|local|hybrid|cloud   default: auto
preferredLocalModel  text    default: llama3.2
preferredCloudModel  select  gpt-4o|gpt-4o-mini|claude-sonnet-4-6|claude-haiku-4-5|gemini-1.5-flash
maxTokens         number     default: 1000   min: 1   max: 8000
temperature       number     default: 0.7    min: 0   max: 1
```

**`logic.if` config schema:**
```
expression   code   required   "input.sentiment === 'negative'"
```

**`logic.switch` config schema:**
```
expression   code     required
cases        textarea required   "one case per line"
```

**`data.transform` config schema:**
```
expression   code   required   "return { ...input, newField: input.value.toUpperCase() }"
```

**`trigger.schedule` config schema:**
```
cron   text   required   "0 9 * * 1-5"  (9am weekdays)
```

**`trigger.webhook` config schema:**
```
method   select   POST|GET   default: POST
```

---

## 12. CANVAS UI — Vue Flow Integration

**Package:** `@vue-flow/core` — do not build custom canvas.

**Three-panel layout:**
```
┌──────────┬──────────────────────────┬──────────────┐
│  Node    │                          │   Config     │
│  Picker  │       Canvas             │   Panel      │
│  280px   │     (@vue-flow)          │   320px      │
│          │                          │  (slides in) │
└──────────┴──────────────────────────┴──────────────┘
```

**Custom node renderer `BaniyaNode.vue`:**
- Header: coloured left-border strip matching category colour + node icon + label
- Body: 2 key config values shown as read-only preview text
- Status ring around the node border: idle=gray, running=pulsing blue, success=green, error=red
- Cost badge bottom-right after execution: "$0.000" or "free"
- Input handle: left side, single handle labelled "in"
- Output handles: right side, labelled per node type (main / true+false / error)

**Canvas toolbar (top bar of editor):**
- Workflow name (editable inline)
- Active toggle (on/off)
- Save button
- Run button (triggers manual execution)
- Execution status indicator

**Keyboard shortcuts:**
- `Delete` / `Backspace` → delete selected nodes/edges
- `Ctrl+S` → save workflow
- `Ctrl+Z` → undo (use vue-flow's built-in history)
- `Space` → fit view

---

## 13. DASHBOARD UI

**Route:** `/dashboard`

**Four sections:**

**1. Summary cards (row of 4):**
- Total spend (month): `₹ X.XX ($Y.YY)`
- If all cloud: `₹ X.XX ($Y.YY)`
- Baniya saved: `₹ X.XX (Z%)`
- Executions: `N`

**2. Two charts:**
- Donut (Chart.js): % local / hybrid / cloud routing
- Bar chart: daily spend last 30 days, stacked by route type

**3. Audit log table:**
- Columns: Time | Workflow | Node | Sensitivity | Route | Model | Cost | Latency
- Sensitivity badge colours: critical=red, private=amber, internal=blue, public=green
- Route pill colours: local=green, hybrid=amber, cloud=blue
- Sortable, filterable, 20 rows/page

**4. Provider status bar (top, always visible):**
```
Ollama ● running   LM Studio ● offline   OpenAI ● configured   Anthropic ● missing key
```
Polls `/api/baniya/providers/status` every 10 seconds.

---

## 14. DESIGN TOKENS

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

**Typography:**
- Font: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Base: 14px / line-height 1.6
- Weights: 400 regular, 500 medium only
- Code: `'JetBrains Mono', 'Fira Code', monospace`

**No UI component library.** All components hand-built with these tokens.

---

## 15. ENVIRONMENT VARIABLES

**Server (`apps/server/.env`):**
```env
PORT=3000
EDITOR_URL=http://localhost:5173
JWT_SECRET=change-me-in-production
NODE_ENV=development
DATABASE_URL=postgresql://baniya:baniya@localhost:5432/baniya
BANIYA_OLLAMA_URL=http://localhost:11434
BANIYA_LMSTUDIO_URL=http://localhost:1234
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
BANIYA_DEFAULT_ROUTE=auto
BANIYA_BLOCK_CLOUD_FOR=critical
BANIYA_COST_ALERT_USD=5.00
BANIYA_AUDIT_ENABLED=true
BANIYA_AUDIT_RETENTION_DAYS=90
```

**Editor (`apps/editor/.env`):**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## 16. SECURITY RULES

- Never write original PII to any log, file, or database column
- PII → placeholder map lives in memory only, cleared after re-injection
- `BANIYA_BLOCK_CLOUD_FOR=critical` is a hard code block — cannot be overridden by user
- All API routes (except `/api/auth/*` and `/webhooks/*`) require valid JWT
- Passwords hashed with bcrypt, 12 rounds
- All API inputs validated with Zod before processing
- Node config `{{ expression }}` values must be sandboxed to prevent prompt injection
- WebSocket connections must be authenticated on the upgrade request

---

## 17. PERFORMANCE CONSTRAINTS

- Data classifier: must run in under 50ms for payloads under 100KB
- Canvas: must handle 50+ nodes without degradation
- WebSocket: auto-reconnect with exponential backoff, max 30s interval
- INR exchange rate: fetched from `api.exchangerate-api.com`, cached 1 hour in memory
- Local provider availability: cached 30 seconds
- Local LLM timeout: 30 seconds
- Cloud LLM timeout: 60 seconds

---

## 18. COST CALCULATION

**Savings vs all-cloud:**
For every local or hybrid execution, calculate what it would have cost on `gpt-4o-mini` using the same token counts. The difference is the saving. Sum across all executions in the time range.

```typescript
const hypotheticalCost = (tokensIn / 1000) * 0.00015 + (tokensOut / 1000) * 0.0006;
const actualCost = row.costUSD;
const saving = hypotheticalCost - actualCost;
```

**INR display:**
```
costINR = costUSD × usdToInrRate
```
Always show both: `₹ X.XX ($Y.YY)` — never one without the other.

---

## 19. DEMO WORKFLOW (pre-seeded on first run)

```
[trigger.manual]
      ↓
[ai.classify]
      ↓ private          ↓ public
[ai.llm]              [ai.llm]
route: local          route: cloud
"Summarise           "Summarise
 privately"           concisely"
      ↓                    ↓
          [logic.merge]
                ↓
          [data.set]
          adds: routing_used, cost_usd
                ↓
          [output.response]
```

Seed this into the database on first server startup if no workflows exist. This is the primary demo for judges — it shows classification, branching, dual routing, merge, and response in one workflow.

---

## 20. IMPLEMENTATION ORDER

**Phase 1 — Foundation**
1. Scaffold monorepo, pnpm workspaces, tsconfig.base.json
2. Build `@baniya/types` — all interfaces, no logic
3. Verify: `pnpm -r build` passes

**Phase 2 — Intelligence**
4. Build `@baniya/data-classifier` with all patterns + tests
5. Build `@baniya/llm-router` — providers, sanitizer, cost estimator, router
6. Verify: classifier tests pass, router dispatches correctly

**Phase 3 — Engine**
7. Build `@baniya/workflow-engine` — DAG sorter, dispatcher, all 20 node handlers
8. Build `@baniya/nodes` — registry with metadata for all node types
9. Build `@baniya/audit-logger` — entity, write, query
10. Verify: execute a 3-node workflow in a test file

**Phase 4 — Server**
11. Scaffold `apps/server`, TypeORM connection, JWT middleware
12. Run migrations, verify tables
13. Implement all REST routes with Zod validation
14. WebSocket broadcaster hooked to engine events
15. Verify: curl all endpoints

**Phase 5 — Editor**
16. Scaffold `apps/editor` — Vite, Vue 3, Pinia, Vue Router
17. Design tokens, shared components (Sidebar, Topbar, Modal, Badge)
18. WorkflowList view
19. WorkflowEditor — vue-flow canvas, BaniyaNode, NodePicker, NodeConfigPanel
20. WebSocket integration for live execution status
21. Verify: create workflow, add nodes, connect, run, watch live updates

**Phase 6 — Dashboard + Polish**
22. BaniyaDashboard — cards, charts, audit table, provider status
23. ExecutionDetail view
24. Settings view with dark mode toggle
25. Seed demo workflow
26. Full end-to-end test

---

## 21. CRITICAL DON'TS

- Do NOT use any existing n8n code — this is built from scratch
- Do NOT add Gmail, Slack, Notion, or any SaaS integrations
- Do NOT build a custom canvas — use `@vue-flow/core`
- Do NOT use a UI component library (no Vuetify, Element Plus, PrimeVue)
- Do NOT use any icon library — all icons are inline SVG paths
- Do NOT write PII to any log or database column
- Do NOT allow critical data to route to cloud under any circumstance
- Do NOT use gradients, drop shadows, or heavy animations in the UI
- Do NOT store the INR rate for more than 1 hour without refreshing
- Do NOT allow WebSocket connections without JWT authentication

---

## 22. DEFINITION OF DONE

The project is complete when:
- [ ] Demo workflow runs end-to-end from manual trigger to response
- [ ] A payload with an Aadhaar number routes to local, never cloud
- [ ] A clean business payload routes to cloud
- [ ] A mixed payload takes the hybrid path, PII is scrubbed before cloud call
- [ ] Audit log shows one row per node execution with correct cost and routing
- [ ] Dashboard shows accurate savings vs all-cloud calculation
- [ ] Provider status updates live every 10 seconds
- [ ] Dark mode works across all views
- [ ] WebSocket reconnects automatically on disconnect
- [ ] All API routes reject unauthenticated requests with 401