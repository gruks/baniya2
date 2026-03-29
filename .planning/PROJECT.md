# BANIYA — Project Identity

> Synthesized from `context.md` and `prompt.md`. Those files remain the canonical spec.

## What This Is

Baniya is a visual AI pipeline builder. Users drag nodes onto a canvas, connect them with edges, and run workflows. The core differentiator is **automatic data sensitivity classification** — before every LLM call, Baniya reads the payload, detects PII, and routes the prompt to the cheapest model that is legally allowed to see that data.

- **Private data stays local** (Ollama / LM Studio)
- **Public data goes cloud** (OpenAI / Anthropic / Gemini)
- **Every decision is logged** with cost, latency, and proof

## What This Is NOT

- An integration platform (no Gmail, Slack, Notion connectors)
- A clone of n8n (same canvas UX philosophy, different codebase)
- A chatbot (it is a workflow engine for AI pipelines)

## Core Value

**Shrewd routing. Zero waste. Your data stays where it belongs.**

For every LLM call, Baniya ensures:
1. Data sensitivity is classified (PII detection)
2. The correct routing target is selected (local/hybrid/cloud)
3. The cheapest model for that tier is used
4. Everything is audit-logged with cost savings proof

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite, Pinia, Vue Router |
| Canvas | @vue-flow/core |
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

## Monorepo Structure

```
baniya2/
├── packages/
│   └── @baniya/
│       ├── types/            ← shared TypeScript interfaces
│       ├── data-classifier/  ← PII detection engine
│       ├── llm-router/       ← routing + provider adapters
│       ├── audit-logger/     ← audit log writer + query API
│       ├── workflow-engine/  ← DAG execution core
│       └── nodes/            ← node type registry + metadata
└── apps/
    ├── server/               ← Express API + WebSocket
    └── editor/               ← Vue 3 canvas frontend
```

## Key Constraints

- Never write original PII to any log, database column, or file
- Data classifier must run in under 50ms on payloads under 100KB
- All money displayed in both ₹ INR and $ USD
- Critical-level data cannot be force-routed to cloud (hard block)
- Local provider calls: 30s timeout. Cloud calls: 60s timeout
- All API routes (except `/api/auth/*` and `/webhooks/*`) require valid JWT
- All API inputs validated with Zod
- Dark mode must work across all views
- Canvas must handle 50+ nodes without degradation
- WebSocket auto-reconnect with exponential backoff (max 30s)
- No UI component library — all hand-built with design tokens
- No icon library — all icons are inline SVG paths

## Canonical Spec Files

- **`context.md`** — Complete technical specification (types, patterns, schemas, rules)
- **`prompt.md`** — Full from-scratch build instructions with implementation details

---
*Last updated: 2026-03-29 after brownfield assessment*
