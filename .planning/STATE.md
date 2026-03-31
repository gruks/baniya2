# BANIYA — Current State

## Status: Active Development

## Phase Status

- Phase 1: Foundation - Completed (All verification gaps closed)
- Phase 2: Intelligence - Planning Complete
- Phase 3: Engine - Planning Complete
- Phase 4: Server - Complete
- Phase 5: Editor - Complete
- Phase 6: Dashboard + Polish - Partially Complete
- Phase 7: Agent System - In Progress

## Current Position

- **Active Phase:** 7 — Agent System
- **Active Plan:** 07-04 — Agent templates and template loader
- **Current Plan:** 4/4
- **Phase Progress:** Templates complete, ready for agent nodes

## What's Done

### Phase 1: Foundation ✅

- Monorepo scaffolded with pnpm workspaces
- `@baniya/types` — all shared interfaces (SensitivityLevel, RoutingTarget, NodeType, Workflow, etc.)
- tsconfig.base.json with strict mode
- Build passes across all packages

### Phase 2: Intelligence ✅

- `@baniya/data-classifier` — PII pattern detection (Aadhaar, PAN, IFSC, phone, email, etc.)
- Sensitivity mapping (public → internal → private → critical)
- `@baniya/llm-router` — BaniyaRouter with local/hybrid/cloud routing
- Sanitizer with placeholder-based PII scrubbing
- Cost estimator with token price table
- Provider adapters for Ollama, LM Studio, OpenAI, Anthropic, Gemini

### Phase 3: Engine ✅

- `@baniya/workflow-engine` — DAG execution with topological sort (Kahn's)
- All 20 node type handlers implemented
- `@baniya/nodes` — full registry with metadata, config schemas, icons
- `@baniya/audit-logger` — TypeORM entity, write + query methods

### Phase 4: Server ⚠️ Mostly Complete

- Express server with TypeORM, JWT middleware
- User, Workflow, Execution entities
- Routes: auth, workflows, executions, baniya, webhooks
- WebSocket broadcaster
- Seed data for demo workflow
- **MISSING:** Zod validation on route inputs

### Phase 5: Editor ⚠️ Partially Complete

- Vue 3 + Vite scaffold with Pinia + Vue Router
- Design tokens (CSS custom properties, dark mode variables)
- AppSidebar component
- BaniyaNode custom canvas node
- All 7 views exist (Login, Register, WorkflowList, WorkflowEditor, ExecutionDetail, BaniyaDashboard, Settings)
- API client layer (auth, baniya, executions, workflows)
- Stores (auth, providers, workflows)
- WebSocket composable
- **MISSING:** NodePicker, NodeConfigPanel, EdgeLabel, MiniExecutionBadge, Topbar, Modal, Badge, Spinner, EmptyState
- **MISSING:** Dashboard sub-components (CostCard, SavingsCard, RoutingPie, AuditTable, ProviderStatus)

### Phase 7: Agent System ⚙️ In Progress

- @baniya/agents package created
- AgentTemplate, ToolDefinition, AgentExecution types
- Zod-based template validation with comprehensive checks
- AgentStorage with in-memory CRUD and file-based persistence
- Markdown parser with YAML frontmatter support
- **DONE:** Tool registry with file/command tools and security sandbox
- **DONE:** Pre-built templates (researcher, planner, reviewer) with builtin loader
- **NEXT:** Build agent nodes for workflow engine

## Decisions Log

| Decision           | Rationale                                            | Phase |
| ------------------ | ---------------------------------------------------- | ----- |
| pnpm workspaces    | Monorepo management with strict hoisting             | 1     |
| @vue-flow/core     | Proven Vue 3 canvas library, no custom drag-drop     | 5     |
| No UI library      | Hand-built components with design tokens per spec    | 5     |
| TypeORM            | PostgreSQL ORM with entity decorators                | 4     |
| Inline SVG         | No icon library dependency                           | 5     |
| gray-matter        | Robust YAML frontmatter parsing for agent templates  | 7     |
| ESM modules        | Native ESM support with .js extension imports        | 7     |
| Whitelist security | Tool command execution blocks dangerous patterns     | 7     |
| Embedded templates | Template strings in builtin.ts for TypeScript build  | 7     |
| RouterInterface    | Placeholder interface to defer llm-router dependency | 7     |

## Blockers

None currently.

## Next Steps

1. Build Phase 7 agent nodes for workflow engine
2. Implement agent execution engine with ReAct loop
3. Add agent UI components (template editor, template library)

---

_Last updated: 2026-03-31_
