# Phase 07 Research: AI Agent System

## Phase Overview

Build an AI Agent system that allows users to define custom AI agents using structured prompt templates. These agents can execute complex workflows using tools, similar to Claude Code's agent system.

## Research Questions

1. **What template format best supports agent definition?**
2. **How to implement a secure tool registry?**
3. **How to integrate agents with Baniya's workflow engine?**
4. **What built-in tools are essential for agent operation?**

## Findings

### Template Format

**Recommended format:** YAML frontmatter + Markdown body

```yaml
---
name: researcher
description: Research agent that gathers information on topics
version: 1.0.0
tools:
  - search_web
  - read_file
  - write_file
model: auto  # auto-route based on sensitivity
max_iterations: 10
---

## Role
You are a research assistant that helps gather and synthesize information.

## Instructions
1. First understand the user's research goal
2. Use search to find relevant information
3. Read key sources for details
4. Synthesize findings into a clear summary

## Output Format
Always return structured JSON:
{
  "topic": "...",
  "summary": "...",
  "sources": [...],
  "findings": [...]
}
```

**Rationale:**

- YAML frontmatter for machine-readable metadata
- Markdown body for human-readable instructions
- Compatible with existing GSD workflow templates
- Easy to parse and validate

### Tool Registry

**Core tools to implement:**

| Tool              | Description               | Security                             |
| ----------------- | ------------------------- | ------------------------------------ |
| `read_file`       | Read file contents        | Path validation, size limits         |
| `write_file`      | Create/update files       | Path validation, allowed directories |
| `list_directory`  | List directory contents   | Path validation                      |
| `execute_command` | Run shell commands        | Whitelist of safe commands, timeout  |
| `search_web`      | Search the web (optional) | Rate limiting, API key management    |
| `grep`            | Search file contents      | Path validation, ignore patterns     |
| `glob`            | Find files by pattern     | Path validation                      |

**Security considerations:**

- Sandbox tool execution to project directory
- Command whitelist (no rm -rf, curl | sh, etc.)
- File size limits (max 1MB for read)
- Timeout for long-running operations
- No tool can execute other tools (no recursion)

### Agent Node Types

Two new node types for Baniya:

1. **`agent.execute`** — Run an agent with input, get structured output
   - Inputs: agent_id, input_data, context
   - Outputs: result (JSON), artifacts, logs

2. **`agent.chat`** — Interactive agent conversation
   - Inputs: agent_id, message, history
   - Outputs: response, updated_state

### Integration with Workflow Engine

Agents run as Baniya workflows:

- Agent template → converted to workflow definition
- Tools → implemented as workflow nodes
- Agent state → workflow context
- Execution → standard DAG execution

### Pre-built Templates

**Priority templates:**

1. **Researcher Agent** — Research topics, gather sources, synthesize
2. **Planner Agent** — Break tasks into phases, create roadmaps
3. **Code Reviewer Agent** — Review code for issues, follow project rules
4. **Debugger Agent** — Investigate bugs, propose fixes

## Implementation Approach

1. Start with template system (07-01)
2. Build tool registry with 3-4 core tools (07-02)
3. Add agent node types (07-03)
4. Create pre-built templates (07-04)

## References

- PythonAIAgentFromScratch/main.py — LangChain agent example
- GSD agent patterns — .claude/agents/ structure
- Claude Code agent system — tool calling pattern
