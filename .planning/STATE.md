# BANIYA — Current State

## Status: Active Development

## Phase Status
- Phase 1: Foundation - Completed (All verification gaps closed)
- Phase 2: Intelligence - Planning Complete
- Phase 3: Engine - Planning Complete
- Phase 4: Server - Mostly Complete
- Phase 5: Editor - Partially Complete
- Phase 6: Dashboard + Polish - Early

## Current Position

- **Active Phase:** 4 — Server
- **Active Plan:** 04-04 — Zod validation on all routes + error handling hardening
- **Next Phase:** 5 — Editor (components gap-fill)

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

### Phase 6: Dashboard & Polish ⚠️ Early
- BaniyaDashboard view exists (needs sub-components)
- **MISSING:** ExecutionDetail polish
- **MISSING:** Dark mode toggle in Settings
- **MISSING:** Demo workflow seed verification
- **MISSING:** End-to-end test

## Decisions Log

| Decision | Rationale | Phase |
|----------|-----------|-------|
| pnpm workspaces | Monorepo management with strict hoisting | 1 |
| @vue-flow/core | Proven Vue 3 canvas library, no custom drag-drop | 5 |
| No UI library | Hand-built components with design tokens per spec | 5 |
| TypeORM | PostgreSQL ORM with entity decorators | 4 |
| Inline SVG | No icon library dependency | 5 |

## Blockers

None currently.

## Next Steps

1. Complete Phase 4 (Zod validation)
2. Fill Phase 5 gaps (missing components)
3. Build Phase 6 (dashboard sub-components, polish, demo)

---
*Last updated: 2026-03-29*
