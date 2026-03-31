/**
 * @baniya/agents - Template validation with Zod
 */

import { z } from 'zod';

/**
 * Schema for tool input/output definitions
 */
const SchemaDefinitionSchema = z.object({
  type: z.string(),
  properties: z.record(z.unknown()).optional(),
  required: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * Schema for agent metadata
 */
const AgentMetadataSchema = z
  .object({
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
  })
  .optional();

/**
 * Zod schema for AgentTemplate validation
 */
export const AgentTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be 100 characters or less')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_-]*$/,
      'Agent name must start with a letter and contain only letters, numbers, underscores, or hyphens'
    ),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., 1.0.0)'),
  tools: z
    .array(z.string())
    .min(1, 'At least one tool is required')
    .max(20, 'Maximum 20 tools allowed'),
  model: z.enum(['auto', 'local', 'hybrid', 'cloud']),
  maxIterations: z
    .number()
    .int()
    .min(1, 'maxIterations must be at least 1')
    .max(100, 'maxIterations must be at most 100'),
  instructions: z
    .string()
    .min(1, 'Instructions are required')
    .min(50, 'Instructions must be at least 50 characters')
    .max(10000, 'Instructions must be 10000 characters or less'),
  outputSchema: SchemaDefinitionSchema.optional(),
  metadata: AgentMetadataSchema,
});

/**
 * Type inferred from the schema
 */
export type ValidatedAgentTemplate = z.infer<typeof AgentTemplateSchema>;

/**
 * Validation error with field paths
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  data?: ValidatedAgentTemplate;
}

/**
 * Validate an agent template
 * @param template - Raw template object to validate
 * @returns ValidationResult with success status and errors or validated data
 */
export function validateTemplate(template: unknown): ValidationResult {
  const result = AgentTemplateSchema.safeParse(template);

  if (!result.success) {
    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    errors: [],
    data: result.data,
  };
}

/**
 * Validate and throw on error
 * @param template - Raw template object to validate
 * @returns Validated template
 * @throws Error with detailed validation messages
 */
export function validateTemplateOrThrow(
  template: unknown
): ValidatedAgentTemplate {
  const result = validateTemplate(template);

  if (!result.success) {
    const errorMessages = result.errors
      .map(e => `${e.field}: ${e.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  return result.data!;
}

/**
 * Validate a list of tool names against available tools
 * @param toolNames - Array of tool names to validate
 * @param availableTools - Array of available tool definitions
 * @returns ValidationResult
 */
export function validateTools(
  toolNames: string[],
  availableTools: { name: string }[]
): ValidationResult {
  const availableToolNames = new Set(availableTools.map(t => t.name));
  const invalidTools = toolNames.filter(t => !availableToolNames.has(t));

  if (invalidTools.length > 0) {
    return {
      success: false,
      errors: [
        {
          field: 'tools',
          message: `Unknown tools: ${invalidTools.join(', ')}`,
        },
      ],
    };
  }

  return {
    success: true,
    errors: [],
  };
}
