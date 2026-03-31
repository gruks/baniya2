/**
 * @baniya/agents - Built-in template loader
 */

import { parseTemplate } from '../parser.js';
import type { AgentTemplate } from '../types.js';

/**
 * Built-in template metadata
 */
export interface BuiltinTemplateInfo {
  name: string;
  description: string;
  version: string;
}

/**
 * All built-in templates - inline content for bundling
 */
const BUILTIN_TEMPLATES: Record<string, string> = {
  researcher: `---
name: researcher
description: Research agent that gathers information on topics
version: 1.0.0
tools: [search_web, read_file, write_file]
model: auto
max_iterations: 10
---

## Role

You are a research assistant that helps gather and synthesize information from multiple sources.

## Instructions

1. First understand the user's research goal - ask clarifying questions if needed
2. Use search to find relevant information sources
3. Read key sources for detailed information
4. Organize findings by theme
5. Synthesize into a clear summary with citations

## Output Format

Return structured JSON:
{
  "topic": "...",
  "summary": "...",
  "sources": [{"url": "...", "title": "...", "relevance": "..."}],
  "findings": [{"theme": "...", "details": "...", "confidence": "high|medium|low"}]
}

Use search_web tool to find information, read_file to examine documents.`,

  planner: `---
name: planner
description: Breaks tasks into phases with actionable plans
version: 1.0.0
tools: [read_file, list_directory, execute_command]
model: auto
max_iterations: 5
---

## Role

You are a planning specialist that breaks complex tasks into executable phases.

## Instructions

1. Analyze the task and understand the goal
2. Identify dependencies and constraints
3. Break into sequential phases
4. Each phase should have 2-3 tasks
5. Consider parallel execution where possible

## Output Format

Return structured JSON:
{
  "task": "...",
  "phases": [
    {
      "name": "phase-1",
      "objective": "...",
      "tasks": [{"name": "...", "action": "...", "depends_on": []}],
      "wave": 1
    }
  ],
  "dependencies": [...],
  "estimated_complexity": "low|medium|high"
}`,

  reviewer: `---
name: reviewer
description: Reviews code for issues, bugs, and improvements
version: 1.0.0
tools: [read_file, glob, execute_command]
model: auto
max_iterations: 8
---

## Role

You are a code review specialist focused on quality, security, and best practices.

## Instructions

1. Examine the codebase structure first
2. Review code for:
   - Security vulnerabilities (SQL injection, XSS, hardcoded secrets)
   - Error handling gaps
   - Performance issues
   - Code quality (naming, duplication, complexity)
   - Best practices violations
3. Use glob to find relevant files
4. Read key files to understand context

## Output Format

Return structured JSON:
{
  "files_reviewed": [...],
  "issues": [
    {"severity": "critical|high|medium|low", "file": "...", "line": "...", "type": "...", "description": "...", "recommendation": "..."}
  ],
  "summary": "...",
  "score": 1-10
}`,
};

/**
 * Get list of available built-in templates
 */
export function listBuiltin(): BuiltinTemplateInfo[] {
  const templates: BuiltinTemplateInfo[] = [];

  for (const [name, content] of Object.entries(BUILTIN_TEMPLATES)) {
    try {
      const template = parseTemplate(content);
      templates.push({
        name: template.name,
        description: template.description,
        version: template.version,
      });
    } catch {
      // Skip invalid templates
    }
  }

  return templates;
}

/**
 * Load a built-in template by name
 * @param name - Template name (e.g., 'researcher', 'planner', 'reviewer')
 * @returns Parsed AgentTemplate
 * @throws Error if template not found or invalid
 */
export function loadTemplate(name: string): AgentTemplate {
  const content = BUILTIN_TEMPLATES[name];

  if (!content) {
    const available = Object.keys(BUILTIN_TEMPLATES).join(', ');
    throw new Error(
      `Template "${name}" not found. Available templates: ${available}`
    );
  }

  return parseTemplate(content);
}

/**
 * Import all built-in templates
 * @returns Map of template name to parsed AgentTemplate
 */
export function importAll(): Map<string, AgentTemplate> {
  const templates = new Map<string, AgentTemplate>();

  for (const [name, content] of Object.entries(BUILTIN_TEMPLATES)) {
    try {
      const template = parseTemplate(content);
      templates.set(name, template);
    } catch (error) {
      console.warn(`Failed to parse built-in template "${name}":`, error);
    }
  }

  return templates;
}

/**
 * Check if a template is built-in
 */
export function isBuiltin(name: string): boolean {
  return name in BUILTIN_TEMPLATES;
}

/**
 * Get all built-in template names
 */
export function getBuiltinNames(): string[] {
  return Object.keys(BUILTIN_TEMPLATES);
}
