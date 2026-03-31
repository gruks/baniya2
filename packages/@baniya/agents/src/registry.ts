/**
 * @baniya/agents - Tool Registry
 *
 * Provides centralized tool registration and discovery for agents.
 */

import type { ToolDefinition, ToolExecutor } from './types.js';

/**
 * ToolRegistry - Manages tool registration and discovery
 *
 * Tools are registered by name and can be retrieved, listed, or checked for existence.
 * Each tool can have an optional executor function for execution.
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition, executor?: ToolExecutor): void {
    if (!tool.name) {
      throw new Error('Tool name is required');
    }
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    if (executor) {
      this.executors.set(tool.name, executor);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get the executor function for a tool
   */
  getExecutor(name: string): ToolExecutor | undefined {
    return this.executors.get(name);
  }

  /**
   * List all registered tools
   */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool names only (lighter than full list)
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear all tools (mainly for testing)
   */
  clear(): void {
    this.tools.clear();
    this.executors.clear();
  }

  /**
   * Get tools by category/filter
   */
  getSecure(): ToolDefinition[] {
    return this.list().filter(t => t.requiresSecureEnvironment === true);
  }

  /**
   * Get count of registered tools
   */
  count(): number {
    return this.tools.size;
  }
}

// Default singleton instance
const defaultRegistry = new ToolRegistry();

export { defaultRegistry };
