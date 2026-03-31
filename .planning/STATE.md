# BANIYA — Current State

## Status: Active Development

## Phase Status

- Phase 1: Foundation - Completed (All verification gaps closed)
- Phase 2: Intelligence - Completed
- Phase 3: Engine - Completed
- Phase 4: Server ✅ Complete (All gaps closed: webhooks.ts, filesystem.ts validation added)
- Phase 5: Editor ✅ Complete (05-04 + 05-05 + 05-06: All components built, wired, and verified)
- Phase 6: Dashboard & Polish - Partially Complete
- Phase 7: Agent System - Complete

## Current Position

- **Active Phase:** 7 — Agent System
- **Active Plan:** Complete
- **Current Plan:** 4/4
- **Phase Progress:** All 4 plans complete. Phase verified and ready.

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

### Phase 4: Server ✅ Complete

- Express server with TypeORM, JWT middleware
- User, Workflow, Execution entities
- Routes: auth, workflows, executions, baniya, webhooks
- WebSocket broadcaster
- Seed data for demo workflow
- **Zod validation on ALL API routes**

### Phase 5: Editor ✅ Complete

- Vue 3 + Vite scaffold with Pinia + Vue Router
- Design tokens (CSS custom properties, dark mode variables)
- AppSidebar component
- BaniyaNode custom canvas node
- All 7 views exist (Login, Register, WorkflowList, WorkflowEditor, ExecutionDetail, BaniyaDashboard, Settings)
- API client layer (auth, baniya, executions, workflows)
- Stores (auth, providers, workflows)
- WebSocket composable
- **NodePicker** — Left sidebar (280px), search, drag-to-add, all node types from @baniya/nodes
- **NodeConfigPanel** — Right panel (320px), dynamic field rendering (text/textarea/number/boolean/select/code/expression)
- **Shared components** — Topbar, Modal, Badge, Spinner, EmptyState — all wired into consuming views
- **Canvas components** — EdgeLabel, MiniExecutionBadge — integrated into Vue Flow and BaniyaNode
- **WorkflowEditor** — Three-panel layout fully integrated with all components
- **Build passes** — vue-tsc + vite build clean
- **VERIFICATION.md:** 16/16 must-haves verified (was 10/16)

### Phase 7: Agent System ✅ Complete

- @baniya/agents package created
- AgentTemplate, ToolDefinition, AgentExecution types
- Zod-based template validation with comprehensive checks
- AgentStorage with in-memory CRUD and file-based persistence
- Markdown parser with YAML frontmatter support
- Tool registry with file/command tools and security sandbox
- Pre-built templates (researcher, planner, reviewer) with builtin loader
- Agent node types (agent.execute, agent.chat) with handlers in workflow engine
- AgentExecutor with ReAct loop implementation

## Decisions Log

| Decision                                                       | Rationale                                            | Phase |
| -------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| pnpm workspaces                                                | Monorepo management with strict hoisting             | 1     |
| @vue-flow/core                                                 | Proven Vue 3 canvas library, no custom drag-drop     | 5     |
| No UI library                                                  | Hand-built components with design tokens per spec    | 5     |
| TypeORM                                                        | PostgreSQL ORM with entity decorators                | 4     |
| Inline SVG                                                     | No icon library dependency                           | 5     |
| gray-matter                                                    | Robust YAML frontmatter parsing for agent templates  | 7     |
| ESM modules                                                    | Native ESM support with .js extension imports        | 7     |
| Whitelist security                                             | Tool command execution blocks dangerous patterns     | 7     |
| Embedded templates                                             | Template strings in builtin.ts for TypeScript build  | 7     |
| RouterInterface                                                | Placeholder interface to defer llm-router dependency | 7     |
| LLMCallFunction                                                | Decouple AgentExecutor from router implementation    | 7     |
| ToolExecutor                                                   | Dynamic tool execution at runtime in ToolRegistry    | 7     |
| Explicit Record types for Badge color mapping (TS strict mode) | 5-06                                                 |
| Vue Flow edge template with BezierEdge + EdgeLabel overlay     | 5-06                                                 |

## Blockers

None currently.

## Next Steps

1. Complete remaining work on Phase 6 (Dashboard & Polish)
2. Phase 8: Not yet planned

---

_Last updated: 2026-03-31_
