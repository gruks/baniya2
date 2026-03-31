/**
 * @baniya/agents - Agent Executor
 *
 * AgentExecutor implements the ReAct loop (Reason + Act + Observe)
 * for running AI agents with tools in a workflow context.
 */

import type {
  AgentTemplate,
  AgentExecutionResult,
  AgentExecutionHistory,
  ToolResult,
} from './types.js';
import type { ToolRegistry } from './registry.js';

// TODO: Import from @baniya/llm-router when available
// import type { BaniyaRouter } from '@baniya/llm-router';
// import type { RouterConfig } from '@baniya/types';

// Placeholder router interface for now
interface RouterInterface {
  route(
    input: Record<string, unknown>,
    prompt: string,
    config?: unknown
  ): Promise<{
    text: string;
    model: string;
    tokensIn: number;
    tokensOut: number;
    costUSD: number;
  }>;
}

/**
 * Result object returned by AgentExecutor
 */
export interface AgentResult {
  /** Final output from the agent */
  result: Record<string, unknown>;
  /** Any artifacts created during execution */
  artifacts: Record<string, unknown>[];
  /** Execution logs */
  logs: string[];
}

/**
 * Execution context passed to agent
 */
export interface AgentContext {
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  [key: string]: unknown;
}

/**
 * Agent executor with ReAct loop implementation
 *
 * The ReAct loop:
 * 1. Think: LLM generates reasoning about the task
 * 2. Action: LLM selects and executes a tool
 * 3. Observe: Tool result is fed back to LLM
 * 4. Repeat until final answer or max iterations
 */
export class AgentExecutor {
  private tools: ToolRegistry;
  private router: RouterInterface;

  constructor(tools: ToolRegistry, router: RouterInterface) {
    this.tools = tools;
    this.router = router;
  }

  /**
   * Run an agent with the given template, input, and context
   *
   * @param template - The agent template defining behavior and tools
   * @param input - Input data for the agent
   * @param context - Execution context (workflow ID, node ID, etc.)
   * @returns Agent execution result with output, artifacts, and logs
   */
  async run(
    template: AgentTemplate,
    input: Record<string, unknown>,
    context: AgentContext = {}
  ): Promise<AgentResult> {
    const history: AgentExecutionHistory[] = [];
    const artifacts: Record<string, unknown>[] = [];
    const logs: string[] = [];

    logs.push(`[AgentExecutor] Starting agent: ${template.name}`);
    logs.push(`[AgentExecutor] Max iterations: ${template.maxIterations}`);
    logs.push(`[AgentExecutor] Tools available: ${template.tools.join(', ')}`);

    // Build system prompt with tools
    const systemPrompt = this.buildSystemPrompt(template);

    // Initialize state with input
    let state = {
      thought: '',
      action: '',
      observation: '',
      history: [] as string[],
      input: { ...input },
      context: { ...context },
    };

    let iterations = 0;
    let finalOutput: Record<string, unknown> = {};

    // ReAct loop
    while (iterations < template.maxIterations) {
      iterations++;
      logs.push(
        `[AgentExecutor] Iteration ${iterations}/${template.maxIterations}`
      );

      // Generate thought (reasoning about what to do)
      const thoughtPrompt = this.buildThoughtPrompt(
        state,
        template.instructions
      );
      const thoughtResponse = await this.router.route(
        state.input,
        thoughtPrompt,
        this.getRouterConfig(template)
      );

      state.thought = this.extractThought(thoughtResponse.text);
      state.history.push(`Thought ${iterations}: ${state.thought}`);
      history.push({
        timestamp: new Date().toISOString(),
        action: 'thought',
        content: state.thought,
      });

      // Check if we should stop (final answer)
      if (this.isFinalAnswer(state.thought)) {
        logs.push(`[AgentExecutor] Detected final answer`);
        finalOutput = this.extractFinalAnswer(state.thought);
        break;
      }

      // Extract action from thought
      const action = this.extractAction(state.thought);
      if (!action) {
        logs.push(
          `[AgentExecutor] No valid action found, attempting final answer`
        );
        finalOutput = { output: state.thought, reason: 'no_valid_action' };
        break;
      }

      state.action = action.name;
      state.history.push(
        `Action ${iterations}: ${action.name}(${JSON.stringify(action.input)})`
      );
      history.push({
        timestamp: new Date().toISOString(),
        action: 'tool_call',
        content: `Called tool: ${action.name}`,
        toolName: action.name,
        toolInput: action.input,
      });

      logs.push(`[AgentExecutor] Executing tool: ${action.name}`);

      // Execute the tool
      const toolResult = await this.executeTool(action.name, action.input);

      if (!toolResult.success) {
        logs.push(`[AgentExecutor] Tool error: ${toolResult.error}`);
        state.observation = `Error: ${toolResult.error}`;
        history.push({
          timestamp: new Date().toISOString(),
          action: 'error',
          content: state.observation,
          toolName: action.name,
          error: toolResult.error,
        });
      } else {
        logs.push(
          `[AgentExecutor] Tool result: ${JSON.stringify(toolResult.output).slice(0, 200)}`
        );
        state.observation = this.formatObservation(toolResult.output);

        // Track artifacts if any
        if (toolResult.output && typeof toolResult.output === 'object') {
          const output = toolResult.output as Record<string, unknown>;
          if (output.filePath || output.content) {
            artifacts.push({
              iteration: iterations,
              tool: action.name,
              ...output,
            } as Record<string, unknown>);
          }
        }

        history.push({
          timestamp: new Date().toISOString(),
          action: 'tool_result',
          content: state.observation,
          toolName: action.name,
          toolOutput: toolResult.output,
        });
      }

      state.history.push(`Observation ${iterations}: ${state.observation}`);
    }

    // If we hit max iterations without final answer
    if (
      iterations >= template.maxIterations &&
      Object.keys(finalOutput).length === 0
    ) {
      logs.push(`[AgentExecutor] Reached max iterations`);
      finalOutput = {
        output: state.history.join('\n\n'),
        reason: 'max_iterations_reached',
        iterations,
      };
    }

    logs.push(`[AgentExecutor] Completed after ${iterations} iterations`);

    return {
      result: finalOutput,
      artifacts,
      logs,
    };
  }

  /**
   * Build the system prompt with available tools
   */
  private buildSystemPrompt(template: AgentTemplate): string {
    let prompt = template.instructions + '\n\n';
    prompt += '## Available Tools\n\n';

    for (const toolName of template.tools) {
      const tool = this.tools.get(toolName);
      if (tool) {
        prompt += `### ${tool.name}\n`;
        prompt += `${tool.description}\n`;
        if (tool.inputSchema.properties) {
          prompt += `Parameters:\n`;
          for (const [key, prop] of Object.entries(
            tool.inputSchema.properties
          )) {
            prompt += `- ${key}: ${(prop as Record<string, unknown>).type}\n`;
          }
        }
        prompt += '\n';
      }
    }

    prompt += '\n## Instructions\n';
    prompt += '1. Think about what action to take\n';
    prompt += '2. Select a tool and provide its input\n';
    prompt += '3. Observe the result\n';
    prompt += '4. Continue or provide final answer\n';
    prompt += '\nFormat your response as:\n';
    prompt += 'THOUGHT: <your reasoning>\n';
    prompt += 'ACTION: <tool_name> | <json input>\n';
    prompt += 'Or for final answer:\n';
    prompt += 'FINAL: <your final answer as JSON>';

    return prompt;
  }

  /**
   * Build prompt for thought generation
   */
  private buildThoughtPrompt(state: any, instructions: string): string {
    let prompt = instructions + '\n\n';
    prompt += '## Current State\n';
    prompt += `Input: ${JSON.stringify(state.input, null, 2)}\n\n`;

    if (state.history.length > 0) {
      prompt += '## History\n';
      for (const h of state.history.slice(-5)) {
        prompt += `${h}\n\n`;
      }
    }

    if (state.observation) {
      prompt += `## Last Observation\n${state.observation}\n\n`;
    }

    prompt += 'What should happen next? Respond with THOUGHT and ACTION.';
    return prompt;
  }

  /**
   * Get router config from agent template
   */
  private getRouterConfig(template: AgentTemplate): {
    forceRoute?: string;
    maxTokens?: number;
    temperature?: number;
  } {
    return {
      forceRoute: template.model === 'auto' ? 'auto' : template.model,
      maxTokens: 1000,
      temperature: 0.2,
    };
  }

  /**
   * Extract thought from LLM response
   */
  private extractThought(text: string): string {
    // Extract THOUGHT section
    const thoughtMatch = text.match(
      /THOUGHT:\s*([\s\S]*?)(?:ACTION:|FINAL:|$)/i
    );
    return thoughtMatch ? thoughtMatch[1].trim() : text;
  }

  /**
   * Check if thought contains final answer
   */
  private isFinalAnswer(thought: string): boolean {
    return /FINAL:\s*[\s\S]+/i.test(thought) || /FINAL_ANSWER:/i.test(thought);
  }

  /**
   * Extract final answer from thought
   */
  private extractFinalAnswer(thought: string): Record<string, unknown> {
    const finalMatch = thought.match(/(?:FINAL:|FINAL_ANSWER:)\s*([\s\S]+)/i);
    if (finalMatch) {
      try {
        return JSON.parse(finalMatch[1]);
      } catch {
        return { output: finalMatch[1].trim() };
      }
    }
    return { output: thought };
  }

  /**
   * Extract action from thought
   */
  private extractAction(
    thought: string
  ): { name: string; input: Record<string, unknown> } | null {
    // Match ACTION: tool_name | {json}
    const actionMatch = thought.match(/ACTION:\s*(\w+)\s*\|\s*(\{[\s\S]*\})/i);
    if (actionMatch) {
      try {
        return {
          name: actionMatch[1],
          input: JSON.parse(actionMatch[2]),
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Execute a tool by name with input
   */
  private async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        output: null,
        error: `Tool not found: ${toolName}. Available: ${this.tools.list().join(', ')}`,
      };
    }

    try {
      const executor = this.tools.getExecutor(toolName);
      if (!executor) {
        return {
          success: false,
          output: null,
          error: `No executor registered for tool: ${toolName}`,
        };
      }

      const output = await executor(input);
      return { success: true, output };
    } catch (e: any) {
      return {
        success: false,
        output: null,
        error: e.message || String(e),
      };
    }
  }

  /**
   * Format observation for history
   */
  private formatObservation(output: unknown): string {
    if (output === null || output === undefined) {
      return 'No output';
    }
    if (typeof output === 'string') {
      return output.slice(0, 1000);
    }
    return JSON.stringify(output).slice(0, 1000);
  }
}
