# BANIYA — Requirements

## Traced from `context.md` §22 (Definition of Done)

### Validated (implemented, verified in code)

- ✅ **REQ-01**: Monorepo with pnpm workspaces — Phase 1
- ✅ **REQ-02**: Shared TypeScript types package — Phase 1
- ✅ **REQ-03**: Data classifier with India PII patterns — Phase 2
- ✅ **REQ-04**: LLM Router with local/hybrid/cloud paths — Phase 2
- ✅ **REQ-05**: Sanitizer replaces PII with placeholders — Phase 2
- ✅ **REQ-06**: Cost estimator with token price table — Phase 2
- ✅ **REQ-07**: Workflow engine with DAG execution (Kahn's algorithm) — Phase 3
- ✅ **REQ-08**: All 20 node type handlers — Phase 3
- ✅ **REQ-09**: Node registry with metadata, config schemas, icons — Phase 3
- ✅ **REQ-10**: Audit logger (entity, write, query) — Phase 3
- ✅ **REQ-11**: Express server with JWT auth — Phase 4
- ✅ **REQ-12**: REST API routes (auth, workflows, executions, baniya, webhooks) — Phase 4
- ✅ **REQ-13**: WebSocket broadcaster — Phase 4

### Active (in progress)

- [ ] **REQ-14**: Zod validation on ALL API routes — Phase 4
- [ ] **REQ-15**: NodePicker sidebar — drag nodes onto canvas — Phase 5
- [ ] **REQ-16**: NodeConfigPanel — config fields for selected node — Phase 5
- [ ] **REQ-17**: Shared UI components (Topbar, Modal, Badge, Spinner, EmptyState) — Phase 5
- [ ] **REQ-18**: Dashboard sub-components (CostCard, SavingsCard, RoutingPie, AuditTable, ProviderStatus) — Phase 5/6
- [ ] **REQ-19**: Dark mode toggle in Settings — Phase 6
- [ ] **REQ-20**: Demo workflow runs end-to-end from manual trigger to response — Phase 6
- [ ] **REQ-21**: Aadhaar payload routes to local, never cloud — Phase 6 (verification)
- [ ] **REQ-22**: Clean business payload routes to cloud — Phase 6 (verification)
- [ ] **REQ-23**: Mixed payload takes hybrid path, PII scrubbed — Phase 6 (verification)
- [ ] **REQ-24**: Audit log shows one row per node execution — Phase 6 (verification)
- [ ] **REQ-25**: Dashboard shows accurate savings vs all-cloud — Phase 6
- [ ] **REQ-26**: Provider status updates live every 10 seconds — Phase 6
- [ ] **REQ-27**: Dark mode works across all views — Phase 6
- [ ] **REQ-28**: WebSocket reconnects automatically on disconnect — Phase 6
- [ ] **REQ-29**: All API routes reject unauthenticated requests with 401 — Phase 6 (verification)

### Out of Scope (v1)

- Gmail/Slack/Notion integrations — Baniya is a pure AI pipeline tool
- Custom canvas library — using @vue-flow/core
- UI component library (Vuetify, etc.) — hand-built per spec
- Mobile responsive design — desktop-first for v1
- Multi-user collaboration — single user per instance for v1

---
*Last updated: 2026-03-29*
