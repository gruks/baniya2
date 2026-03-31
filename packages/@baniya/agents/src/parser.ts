/**
 * @baniya/agents - Template parser for markdown with YAML frontmatter
 */

import matter from 'gray-matter';
import type { AgentTemplate, AgentModel, SchemaDefinition } from './types.js';

/**
 * Parsed frontmatter and body content
 */
export interface ParsedTemplate {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Extract frontmatter and body from markdown content
 * @param content - Markdown content with YAML frontmatter
 * @returns Parsed frontmatter and body
 */
export function extractFrontmatter(content: string): ParsedTemplate {
  const parsed = matter(content);

  return {
    frontmatter: parsed.data,
    body: parsed.content.trim(),
  };
}

/**
 * Parse a markdown template with YAML frontmatter into an AgentTemplate
 * @param content - Markdown content with YAML frontmatter
 * @returns Parsed AgentTemplate
 * @throws Error if parsing fails
 */
export function parseTemplate(content: string): AgentTemplate {
  const { frontmatter, body } = extractFrontmatter(content);

  // Map frontmatter to AgentTemplate fields
  const template: AgentTemplate = {
    name: String(frontmatter.name ?? ''),
    description: String(frontmatter.description ?? ''),
    version: String(frontmatter.version ?? '1.0.0'),
    tools: Array.isArray(frontmatter.tools)
      ? frontmatter.tools.map(String)
      : [],
    model: mapModel(frontmatter.model),
    maxIterations: parseInt(String(frontmatter.maxIterations ?? '10'), 10),
    instructions: body || String(frontmatter.instructions ?? ''),
  };

  // Optional fields
  if (frontmatter.outputSchema) {
    template.outputSchema = normalizeSchema(
      frontmatter.outputSchema as Record<string, unknown>
    );
  }

  if (frontmatter.metadata) {
    template.metadata = frontmatter.metadata as AgentTemplate['metadata'];
  }

  // Validate required fields
  if (!template.name) {
    throw new Error('Template name is required in frontmatter');
  }
  if (!template.description) {
    throw new Error('Template description is required in frontmatter');
  }
  if (!template.instructions) {
    throw new Error(
      'Template instructions are required (body or frontmatter.instructions)'
    );
  }

  return template;
}

/**
 * Map model string to AgentModel type
 */
function mapModel(model: unknown): AgentModel {
  if (!model) return 'auto';

  const modelStr = String(model).toLowerCase();
  if (modelStr === 'local' || modelStr === 'hybrid' || modelStr === 'cloud') {
    return modelStr;
  }
  return 'auto';
}

/**
 * Normalize schema definition from parsed YAML
 */
function normalizeSchema(schema: Record<string, unknown>): SchemaDefinition {
  return {
    type: String(schema.type ?? 'object'),
    properties: schema.properties as Record<string, unknown> | undefined,
    required: Array.isArray(schema.required)
      ? schema.required.map(String)
      : undefined,
    description: schema.description as string | undefined,
  };
}

/**
 * Serialize an AgentTemplate to markdown with YAML frontmatter
 * @param template - AgentTemplate to serialize
 * @returns Markdown string with YAML frontmatter
 */
export function serializeTemplate(template: AgentTemplate): string {
  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    name: template.name,
    description: template.description,
    version: template.version,
    tools: template.tools,
    model: template.model,
    maxIterations: template.maxIterations,
  };

  if (template.outputSchema) {
    frontmatter.outputSchema = template.outputSchema;
  }

  if (template.metadata) {
    frontmatter.metadata = template.metadata;
  }

  // Build markdown with frontmatter
  const yaml = stringifyYaml(frontmatter);
  const content = `---\n${yaml}---\n\n${template.instructions}`;

  return content;
}

/**
 * Simple YAML stringifier for frontmatter
 * Handles basic types (strings, numbers, arrays, objects)
 */
function stringifyYaml(
  obj: Record<string, unknown>,
  indent: number = 0
): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === 'string') {
          lines.push(`${prefix}  - ${escapeYamlString(item)}`);
        } else if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}  -`);
          lines.push(
            stringifyYaml(item as Record<string, unknown>, indent + 2)
          );
        } else {
          lines.push(`${prefix}  - ${String(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`);
      lines.push(stringifyYaml(value as Record<string, unknown>, indent + 1));
    } else if (typeof value === 'string') {
      // Check if string needs quoting
      if (value.includes('\n') || value.includes(':') || value.includes('#')) {
        lines.push(`${prefix}${key}: |`);
        for (const line of value.split('\n')) {
          lines.push(`${prefix}  ${line}`);
        }
      } else {
        lines.push(`${prefix}${key}: ${escapeYamlString(value)}`);
      }
    } else {
      lines.push(`${prefix}${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  // If string contains special chars, wrap in quotes
  if (
    /^[\s:\[#&*!|>\'"%@`]/.test(str) ||
    str.includes(': ') ||
    str.includes('---') ||
    str.endsWith(':') ||
    str.startsWith('- ')
  ) {
    // Use single quotes, escape internal single quotes
    return `'${str.replace(/'/g, "''")}'`;
  }
  return str;
}
