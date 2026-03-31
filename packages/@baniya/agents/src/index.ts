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
  ToolResult,
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

// Tool Registry
export { ToolRegistry, defaultRegistry } from './registry.js';

// Sandbox
export {
  Sandbox,
  validatePath,
  validatePathSync,
  validateCommand,
  getAllowedCommands,
  isCommandBlocked,
  applyTimeout,
  setAllowedBaseDirs,
  getAllowedBaseDirs,
  addAllowedBaseDir,
  DEFAULT_TIMEOUT_MS,
} from './sandbox.js';

// File Tools
export {
  readFile,
  writeFile,
  listDirectory,
  glob,
  fileTools,
} from './tools/file-tools.js';

// Command Tools
export {
  executeCommand,
  gitCommand,
  nodeCommand,
  commandTools,
} from './tools/command-tools.js';

/**
 * Get all default tools (file + command tools)
 */
import { fileTools } from './tools/file-tools.js';
import { commandTools } from './tools/command-tools.js';
import { ToolRegistry } from './registry.js';
import type { ToolDefinition } from './types.js';

export function getDefaultTools(): ToolDefinition[] {
  return [...fileTools, ...commandTools];
}

/**
 * Create a registry with default tools pre-registered
 */
export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of getDefaultTools()) {
    registry.register(tool);
  }
  return registry;
}
