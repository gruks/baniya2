# Baniya — AI Workflow Engine

> Shrewd routing. Zero waste. Your data stays where it belongs.

Baniya is a visual AI pipeline builder with **automatic data sensitivity classification**. Users drag nodes onto a canvas, connect them with edges, and run workflows. Before every LLM call, Baniya reads the payload, detects PII (Aadhaar, PAN, etc.), and routes the prompt to the cheapest model that is legally allowed to see that data. Private data stays local. Public data goes cloud. Every decision is logged.

## Core Features

### 🔒 Intelligent Data Routing

- **Automatic PII Detection** — Detects Indian PII patterns (Aadhaar, PAN, IFSC, phone, email, etc.)
- **Four Sensitivity Levels** — public → internal → private → critical
- **Three Routing Paths:**
  - **Local** — Critical/private data goes to local LLMs (Ollama, LM Studio)
  - **Hybrid** — Scrubs PII before sending to cloud, reinjects after
  - **Cloud** — Public data uses cheapest cloud model (Gemini, GPT, Claude)
- **Hard Block** — Critical data can never route to cloud

### 🎨 Visual Workflow Editor

- **Drag-and-drop canvas** — Built on @vue-flow/core
- **30+ Node Types:**
  - **Triggers:** Manual, Webhook, Schedule (cron)
  - **AI:** LLM, Classify, Embed, Summarise, Extract, Rewrite, Translate, Moderate, Agent, Ollama
  - **Logic:** IF, Switch, Merge, Loop, Wait
  - **Data:** Set, Transform, Filter, Aggregate
  - **Storage:** Read, Write, List, Delete, Mkdir
  - **Folder:** Connect to local folders, read/write files, patch code
  - **Agent:** Execute Agent, Chat Agent
  - **Output:** Response, Log
- **Real-time execution** — WebSocket updates as each node runs
- **Cost badges** — See cost per node after execution

### 🤖 AI Agent System

- **Agent Templates** — Define agents with system prompt + available tools
- **Tool Registry:**
  - File operations (read, write, list, delete)
  - Command execution (run shell commands)
  - Search (web search, code search)
- **Pre-built Templates:** Researcher, Planner, Reviewer
- **ReAct Execution Loop** — LLM decides which tool to use each iteration
- **Folder Integration** — Agents can read/write files in local folders

### 📊 Dashboard & Analytics

- **Cost Summary** — Total spend in INR and USD
- **Savings Calculator** — Shows savings vs. all-cloud routing
- **Routing Distribution** — Donut chart (local/hybrid/cloud)
- **Audit Log** — Every LLM call logged with sensitivity, routing, model, cost, latency
- **Provider Status** — Live status of Ollama, LM Studio, OpenAI, Anthropic, Gemini

### 🔐 Security

- **JWT Authentication** — All API routes protected (except auth & webhooks)
- **Password Hashing** — bcrypt with 12 rounds
- **Input Validation** — Zod schemas on all endpoints
- **No PII in Logs** — Sanitizer replaces PII with typed placeholders
- **Memory-only PII** — Placeholder maps cleared after re-injection

### 🌙 Dark Mode

- Toggle in Settings
- Persists across sessions
- No flash on page load

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Frontend   | Vue 3, TypeScript, Vite, Pinia, Vue Router |
| Canvas     | @vue-flow/core                             |
| Backend    | Node.js, Express.js, TypeScript            |
| Auth       | JWT, bcrypt                                |
| Database   | PostgreSQL 16, TypeORM                     |
| Local LLMs | Ollama, LM Studio                          |
| Cloud LLMs | OpenAI, Anthropic, Google Gemini           |
| Monorepo   | pnpm workspaces                            |

## Project Structure

```
baniya/
├── packages/
│   ├── @baniya/types/            ← shared TypeScript interfaces
│   ├── @baniya/data-classifier/  ← PII detection engine
│   ├── @baniya/llm-router/       ← routing + provider adapters
│   ├── @baniya/audit-logger/     ← audit log writer + query API
│   ├── @baniya/workflow-engine/  ← DAG execution core
│   ├── @baniya/nodes/            ← node type registry + metadata
│   └── @baniya/agents/           ← agent system + tools
└── apps/
    ├── server/                   ← Express API + WebSocket
    └── editor/                   ← Vue 3 canvas frontend
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up postgres -d

# Run dev servers
pnpm dev
```

The server runs at `http://localhost:3000` and the editor at `http://localhost:5173`.

## Environment Variables

**Server (.env):**

```env
PORT=3000
DATABASE_URL=postgresql://baniya:baniya@localhost:5432/baniya
JWT_SECRET=change-me-in-production
BANIYA_OLLAMA_URL=http://localhost:11434
BANIYA_LMSTUDIO_URL=http://localhost:1234
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
```

**Editor (.env):**

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## API Endpoints

| Method | Route                           | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/auth/register`            | Create account       |
| POST   | `/api/auth/login`               | Get JWT token        |
| GET    | `/api/auth/me`                  | Get current user     |
| GET    | `/api/workflows`                | List workflows       |
| POST   | `/api/workflows`                | Create workflow      |
| GET    | `/api/workflows/:id`            | Get workflow         |
| PUT    | `/api/workflows/:id`            | Update workflow      |
| DELETE | `/api/workflows/:id`            | Delete workflow      |
| POST   | `/api/workflows/:id/execute`    | Run workflow         |
| GET    | `/api/executions`               | List executions      |
| GET    | `/api/executions/:id`           | Get execution result |
| GET    | `/api/baniya/cost-summary`      | Cost analytics       |
| GET    | `/api/baniya/audit`             | Audit log            |
| GET    | `/api/baniya/providers/status`  | Provider status      |
| POST   | `/api/baniya/classify`          | Classify payload     |
| POST   | `/webhooks/:workflowId/:nodeId` | Trigger by webhook   |

## Demo Workflow

On first startup, a demo workflow auto-seeds that demonstrates:

1. Data classification (PII vs business text)
2. Branching based on sensitivity
3. Dual routing (local for private, cloud for public)
4. Merge nodes
5. Response output

## Progress

| Phase | Name               | Status      |
| ----- | ------------------ | ----------- |
| 1     | Foundation         | ✅ Complete |
| 2     | Intelligence       | ✅ Complete |
| 3     | Engine             | ✅ Complete |
| 4     | Server             | ✅ Complete |
| 5     | Editor             | ✅ Complete |
| 6     | Dashboard & Polish | ⚠️ Partial  |
| 7     | AI Agent System    | ✅ Complete |

## License

MIT
