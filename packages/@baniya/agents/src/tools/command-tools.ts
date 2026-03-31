/**
 * @baniya/agents - Command Execution Tools
 *
 * Tools for executing shell commands with security validations.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolDefinition, ToolResult } from '../types.js';
import {
  validateCommand,
  applyTimeout,
  DEFAULT_TIMEOUT_MS,
} from '../sandbox.js';

const execAsync = promisify(exec);

/**
 * Execute a shell command
 * Security: Whitelist validation, timeout limits, working directory restriction
 */
export async function executeCommand(
  command: string,
  args: string[] = [],
  options?: { cwd?: string; timeout?: number }
): Promise<ToolResult> {
  try {
    // Validate base command
    if (!validateCommand(command)) {
      return {
        success: false,
        error: `Command "${command}" is not allowed. Use: git, node, pnpm, npm, python, cat, ls, echo, mkdir, grep, etc.`,
        output: null,
      };
    }

    // Build full command
    const fullCommand =
      args.length > 0 ? `${command} ${args.join(' ')}` : command;

    // Apply timeout
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

    let stdout = '';
    let stderr = '';

    try {
      const result = await applyTimeout(
        execAsync(fullCommand, {
          cwd: options?.cwd,
          timeout,
          maxBuffer: 1024 * 1024, // 1MB output limit
        }),
        timeout
      );
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: unknown) {
      // Check if it's a timeout error
      if (
        execError instanceof Error &&
        execError.message.includes('timed out')
      ) {
        return {
          success: false,
          error: `Command timed out after ${timeout}ms`,
          output: null,
        };
      }

      // For other errors, capture stdout/stderr if available
      const error = execError as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      stdout = error.stdout ?? '';
      stderr = error.stderr ?? error.message ?? '';
    }

    return {
      success: true,
      output: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: stderr && !stdout ? 1 : 0,
        command: fullCommand,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null,
    };
  }
}

/**
 * Execute a git command (convenience wrapper)
 */
export async function gitCommand(
  args: string[],
  options?: { cwd?: string }
): Promise<ToolResult> {
  return executeCommand('git', args, options);
}

/**
 * Execute a node script
 */
export async function nodeCommand(
  script: string,
  options?: { cwd?: string }
): Promise<ToolResult> {
  return executeCommand('node', ['-e', script], options);
}

/**
 * Tool definitions for command execution
 */
export const commandTools: ToolDefinition[] = [
  {
    name: 'execute_command',
    description:
      'Execute a shell command. Only whitelisted commands are allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'Command to execute (git, node, pnpm, npm, python, etc.)',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Command arguments',
        },
        cwd: {
          type: 'string',
          description: 'Working directory (defaults to project root)',
        },
      },
      required: ['command'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        exitCode: { type: 'number' },
        command: { type: 'string' },
      },
    },
    requiresSecureEnvironment: true,
  },
];

// Re-export ToolResult type
export type { ToolResult } from '../types.js';
