# BANIYA — Roadmap

## Milestone 1: MVP

Plans:

- [x] 01-foundation-01-PLAN.md — Setup monorepo configuration and base tooling
- [x] 01-foundation-02-PLAN.md — Create package structure for all packages and apps
- [x] 01-foundation-03-PLAN.md — Set up development environment, documentation, and CI/CD
- [x] 01-foundation-04-PLAN.md — Close verification gaps: ESLint/Prettier config, documentation, CI workflow, script implementations
- [x] 07-01-PLAN.md — Agent template system
- [x] 07-02-PLAN.md — Tool registry
- [x] 07-03-PLAN.md — Agent node types
- [x] 07-04-PLAN.md — Pre-built templates

### Progress

| Phase | Name               | Status      | Plans | Completed |
| ----- | ------------------ | ----------- | ----- | --------- |
| 1     | Foundation         | ✅ Complete | 3     | 3         |
| 2     | Intelligence       | ✅ Complete | 3     | 3         |
| 3     | Engine             | ✅ Complete | 3     | 3         |
| 4     | Server             | ✅ Complete | 5     | 5         |
| 5     | Editor             | ✅ Complete | 6     | 6         |
| 6     | Dashboard & Polish | ⚠️ Partial  | 4     | 1         |
| 7     | AI Agent System    | ✅ Complete | 4     | 4         |

### Phases

- [x] **Phase 1: Foundation** — Scaffold monorepo, types, build verification
  - [x] 01-01: Monorepo scaffold (pnpm-workspace.yaml, tsconfig.base.json, root package.json)
  - [x] 01-02: `@baniya/types` — all shared interfaces
  - [x] 01-03: Build verification (`pnpm -r build` passes)

- [x] **Phase 2: Intelligence** — Data classifier + LLM router
  - [x] 02-01: `@baniya/data-classifier` — patterns, classifier logic, tests
  - [x] 02-02: `@baniya/llm-router` — providers, sanitizer, cost estimator, router
  - [x] 02-03: Integration verification

- [x] **Phase 3: Engine** — Workflow engine + node registry + audit
  - [x] 03-01: `@baniya/workflow-engine` — DAG sorter, dispatcher, 20 node handlers
  - [x] 03-02: `@baniya/nodes` — registry with metadata for all node types
  - [x] 03-03: `@baniya/audit-logger` — entity, write, query

- [x] **Phase 4: Server** — Express API + WebSocket
  - [x] 04-01: Scaffold server (Express, TypeORM, JWT middleware, entities)
  - [x] 04-02: REST routes (auth, workflows, executions, baniya, webhooks)
  - [x] 04-03: WebSocket broadcaster + seed data
  - [x] 04-04: Zod validation on all routes + error handling hardening (2 gaps found)
  - [x] 04-05: Close validation gaps (webhooks.ts + filesystem.ts)

- [x] **Phase 5: Editor** — Vue 3 canvas frontend
  - [x] 05-01: Scaffold (Vite, Vue 3, Pinia, router, design tokens, AppSidebar)
  - [x] 05-02: WorkflowList + WorkflowEditor + BaniyaNode
  - [x] 05-03: API layer + stores + WebSocket composable
  - [x] 05-04: Missing components (NodePicker, NodeConfigPanel, EdgeLabel, MiniExecutionBadge, Topbar, Modal, Badge, Spinner, EmptyState)
  - [x] 05-05: Dashboard components (CostCard, SavingsCard, RoutingPie, AuditTable, ProviderStatus)
  - [x] 05-06: Gap closure — wire orphaned components (Badge, Modal, Spinner, EmptyState, EdgeLabel, MiniExecutionBadge)

- [ ] **Phase 6: Dashboard & Polish** — Dashboard views + dark mode + demo
  - [x] 06-01: BaniyaDashboard view (exists but needs dashboard sub-components)
  - [ ] 06-02: ExecutionDetail view polish + Settings view dark mode toggle
  - [ ] 06-03: Login/Register views polish + proper auth flow
  - [ ] 06-04: Seed demo workflow + end-to-end verification

- [x] **Phase 7: AI Agent System** — Agent templates + tool registry + execution
  - [x] 07-01: Agent template system (template format, validation, storage)
  - [x] 07-02: Tool registry (built-in tools: file ops, command, search)
  - [x] 07-03: Agent node types (agent.execute, agent.chat)
  - [x] 07-04: Pre-built template library (Researcher, Planner, Reviewer)

---

_Last updated: 2026-03-31_
