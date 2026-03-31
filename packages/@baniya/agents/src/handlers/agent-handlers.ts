/**
 * @baniya/agents - Node Handlers
 *
 * Node handlers for agent.execute and agent.chat node types
 * in the Baniya workflow engine.
 */

import type {
  NodeHandler,
  NodeHandlerOutput,
  ExecutionContext,
} from '@baniya/types';
import {
  AgentExecutor,
  type AgentResult,
  type AgentContext,
} from '../executor.js';
import { ToolRegistry } from '../registry.js';
import { AgentStorage } from '../storage.js';
import type { ToolExecutor } from '../types.js';
import {
  readFile,
  writeFile,
  listDirectory,
  glob,
} from '../tools/file-tools.js';
import { executeCommand } from '../tools/command-tools.js';

/**
 * Create LLM call function that uses the workflow engine's router
 * This is a simple wrapper that will be connected to the workflow engine
 */
function createLLMCallFunction(): (
  prompt: string,
  systemPrompt?: string
) => Promise<{ text: string; model: string }> {
  // This will be replaced with actual router connection in workflow-engine
  return async (prompt: string, systemPrompt?: string) => {
    // TODO: Connect to BaniyaRouter through workflow engine context
    throw new Error(
      'LLM call not configured. Connect AgentExecutor to workflow engine.'
    );
  };
}

/**
 * Create tool executors map for the registry
 */
function createToolExecutors(): Record<string, ToolExecutor> {
  return {
    read_file: async (input: Record<string, unknown>) => {
      const path = input.path as string;
      if (!path) return { success: false, error: 'path is required' };
      return readFile(path);
    },
    write_file: async (input: Record<string, unknown>) => {
      const path = input.path as string;
      const content = input.content as string;
      if (!path || content === undefined)
        return { success: false, error: 'path and content are required' };
      return writeFile(path, content);
    },
    list_directory: async (input: Record<string, unknown>) => {
      const path = input.path as string;
      if (!path) return { success: false, error: 'path is required' };
      return listDirectory(path);
    },
    glob: async (input: Record<string, unknown>) => {
      const pattern = input.pattern as string;
      if (!pattern) return { success: false, error: 'pattern is required' };
      return glob(pattern);
    },
    execute_command: async (input: Record<string, unknown>) => {
      const command = input.command as string;
      const args = input.args as string[] | undefined;
      const cwd = input.cwd as string | undefined;
      if (!command) return { success: false, error: 'command is required' };
      return executeCommand(command, args, { cwd });
    },
  };
}

/**
 * Execute Agent Node Handler
 *
 * Loads agent template by ID, creates executor, runs agent with input data
 */
export const executeAgentNode: NodeHandler = {
  async execute(
    input: unknown,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<NodeHandlerOutput> {
    try {
      const agentId = config.agentId as string;
      const maxIterations = config.maxIterations
        ? Number(config.maxIterations)
        : 10;

      if (!agentId) {
        return { error: { message: 'agentId is required in node config' } };
      }

      // Load agent template from storage
      const storage = new AgentStorage();
      const template = await storage.get(agentId);

      if (!template) {
        return { error: { message: `Agent template not found: ${agentId}` } };
      }

      // Create registry with executors
      const registry = new ToolRegistry();
      const executors = createToolExecutors();

      for (const toolName of template.tools) {
        const executor = executors[toolName];
        // Get tool definition from default tools
        const defaultTools = await import('../index.js').then(m =>
          m.getDefaultTools()
        );
        const toolDef = defaultTools.find(t => t.name === toolName);

        if (toolDef && executor) {
          registry.register(toolDef, executor);
        }
      }

      // Create LLM call function (placeholder for now)
      const llmCall = createLLMCallFunction();

      // Create executor
      const executor = new AgentExecutor(registry, llmCall);

      // Set max iterations from config
      const effectiveTemplate = { ...template, maxIterations };

      // Run agent
      const result: AgentResult = await executor.run(
        effectiveTemplate,
        input as Record<string, unknown>,
        {
          workflowId: context.workflowId,
          executionId: context.executionId,
          nodeId: context.nodeId,
        }
      );

      return { main: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: {
          message,
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  },
};

/**
 * Chat Agent Node Handler
 *
 * Provides conversational interface with an agent
 * Maintains state across messages
 */
export const chatAgentNode: NodeHandler = {
  async execute(
    input: unknown,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<NodeHandlerOutput> {
    try {
      const agentId = config.agentId as string;
      const maxIterations = config.maxIterations
        ? Number(config.maxIterations)
        : 5;

      if (!agentId) {
        return { error: { message: 'agentId is required in node config' } };
      }

      // Get message from input
      const inputObj = input as Record<string, unknown>;
      const message =
        inputObj.message || inputObj.text || inputObj.content || String(input);

      if (!message) {
        return { error: { message: 'No message provided in input' } };
      }

      // For chat, we currently just execute once
      // TODO: Implement session/state management for multi-turn conversation
      const storage = new AgentStorage();
      const template = await storage.get(agentId);

      if (!template) {
        return { error: { message: `Agent template not found: ${agentId}` } };
      }

      // Create registry with executors
      const registry = new ToolRegistry();
      const executors = createToolExecutors();

      for (const toolName of template.tools) {
        const executor = executors[toolName];
        const defaultTools = await import('../index.js').then(m =>
          m.getDefaultTools()
        );
        const toolDef = defaultTools.find(t => t.name === toolName);

        if (toolDef && executor) {
          registry.register(toolDef, executor);
        }
      }

      const llmCall = createLLMCallFunction();
      const executor = new AgentExecutor(registry, llmCall);

      const effectiveTemplate = { ...template, maxIterations };
      const result = await executor.run(
        effectiveTemplate,
        { message },
        {
          workflowId: context.workflowId,
          executionId: context.executionId,
          nodeId: context.nodeId,
        }
      );

      return {
        main: {
          response: result.result,
          artifacts: result.artifacts,
          logs: result.logs,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        error: {
          message,
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  },
};
