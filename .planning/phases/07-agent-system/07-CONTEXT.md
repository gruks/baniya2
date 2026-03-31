# Phase 07: AI Agent System

## Decisions

1. **Agent Architecture**: Use LangChain-style agent patterns with tool calling capability
2. **Template Format**: Markdown files with frontmatter + XML-structured prompts
3. **Storage**: Store agent templates in `agents/` directory with YAML frontmatter
4. **Execution**: Agents run as Baniya workflows with specialized node types
5. **No External Integrations**: Agents operate on code/files in the project only (no Gmail, Slack, etc.)

## Claude's Discretion

1. **Tool Implementation**: Choose how to implement built-in tools (file operations, command execution, search)
2. **Template Variables**: Design the variable interpolation syntax ({{ variable }})
3. **Agent State**: Decide on memory/state management approach
4. **Validation**: How to validate agent outputs against expected schemas

## Deferred Ideas

1. **Multi-agent Collaboration**: Complex agent teams with communication protocols
2. **Agent Marketplace**: Sharing/selling agent templates
3. **Continuous Learning**: Storing agent feedback/iterations
4. **Agent Chaining**: Sequential agent execution with context passing

## Overview

Build an AI Agent system that allows users to define custom AI agents using structured prompt templates. These agents can execute complex workflows using tools, similar to Claude Code's agent system. The system should integrate with Baniya's workflow engine to provide a visual interface for agent definition and execution.

## Key Features

1. **Agent Templates** — Define agent behavior through markdown templates with frontmatter
2. **Tool Registry** — Built-in tools for file operations, command execution, search
3. **Agent Nodes** — New node types in Baniya for agent execution
4. **Template Library** — Pre-built agent templates (Researcher, Planner, Code Reviewer)
5. **Execution Engine** — Run agents as part of Baniya workflows

## Technical Approach

- Use Baniya's existing LLM router for agent AI calls
- Agents defined as JSON/YAML configurations
- Tool execution through subprocess or direct file operations
- Agent state passed via Baniya's workflow context
