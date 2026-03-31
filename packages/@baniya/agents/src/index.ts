/**
 * @baniya/agents - AI Agent System
 *
 * Export all public APIs
 */

// Types
export type {
  AgentModel,
  SchemaDefinition,
  ToolDefinition,
  AgentTemplate,
  AgentExecution,
  AgentExecutionState,
  AgentExecutionHistory,
  AgentExecutionResult,
} from './types.js';

export {
  validateTemplate,
  validateTemplateOrThrow,
  validateTools,
} from './validator.js';
export type {
  ValidationError,
  ValidationResult,
  ValidatedAgentTemplate,
} from './validator.js';

export { AgentStorage, defaultStorage } from './storage.js';
export type { AgentStorageOptions } from './storage.js';

export {
  parseTemplate,
  serializeTemplate,
  extractFrontmatter,
} from './parser.js';
export type { ParsedTemplate } from './parser.js';
