/**
 * @baniya/agents - Type definitions for AI Agent System
 */

import { RoutingTarget } from '@baniya/types';

/**
 * Supported routing targets for agent models
 */
export type AgentModel = 'auto' | RoutingTarget;

/**
 * Schema definition for tool input/output
 */
export interface SchemaDefinition {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

/**
 * Tool definition interface
 * Each tool has a name, description, and input/output schemas
 */
export interface ToolDefinition {
  /** Unique tool identifier */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON schema for tool input parameters */
  inputSchema: SchemaDefinition;
  /** JSON schema for tool output */
  outputSchema: SchemaDefinition;
  /** Whether this tool requires secure execution (file system, commands) */
  requiresSecureEnvironment?: boolean;
}

/**
 * Agent template interface
 * Defines an agent's behavior, tools, and configuration
 */
export interface AgentTemplate {
  /** Unique agent name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Semantic version */
  version: string;
  /** List of available tools */
  tools: string[];
  /** Model routing preference */
  model: AgentModel;
  /** Maximum iterations before stopping */
  maxIterations: number;
  /** Agent instructions (system prompt) */
  instructions: string;
  /** Output schema for structured responses */
  outputSchema?: SchemaDefinition;
  /** Metadata for UI display */
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
  };
}

/**
 * Agent execution state
 * Tracks running agent instances
 */
export interface AgentExecution {
  /** Unique execution ID */
  id: string;
  /** Template name being executed */
  templateName: string;
  /** User input data */
  input: Record<string, unknown>;
  /** Shared context passed between tool calls */
  context: Record<string, unknown>;
  /** Current execution state */
  state: AgentExecutionState;
  /** Execution history for debugging */
  history: AgentExecutionHistory[];
}

/**
 * Current state of an agent execution
 */
export type AgentExecutionState =
  | 'pending'
  | 'running'
  | 'waiting_for_tool'
  | 'completed'
  | 'error'
  | 'max_iterations_reached';

/**
 * Single entry in execution history
 */
export interface AgentExecutionHistory {
  /** Timestamp of the action */
  timestamp: string;
  /** Type of action performed */
  action: 'thought' | 'tool_call' | 'tool_result' | 'response' | 'error';
  /** Content of the action */
  content: string;
  /** Tool name if action was a tool call */
  toolName?: string;
  /** Tool input if action was a tool call */
  toolInput?: Record<string, unknown>;
  /** Tool output if action was a tool result */
  toolOutput?: unknown;
  /** Error message if action was an error */
  error?: string;
}

/**
 * Result of an agent execution
 */
export interface AgentExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Final output from the agent */
  output: unknown;
  /** Number of iterations used */
  iterationsUsed: number;
  /** Total tokens consumed */
  tokensIn: number;
  tokensOut: number;
  /** Error message if failed */
  error?: string;
  /** Execution history */
  history: AgentExecutionHistory[];
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  output?: unknown;
}

/**
 * Tool executor function type
 */
export type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;
