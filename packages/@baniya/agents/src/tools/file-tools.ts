/**
 * @baniya/agents - File Operation Tools
 *
 * Tools for reading, writing, and listing files with security validations.
 */

import fs from 'fs/promises';
import path from 'path';
import { globSync } from 'glob';
import type { ToolDefinition, ToolResult } from '../types.js';
import { validatePath, validatePathSync } from '../sandbox.js';

// Maximum file size (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Read file contents
 * Security: Validates path, checks size, prevents traversal
 */
export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    if (!validatePath(filePath)) {
      return {
        success: false,
        error: 'Invalid path: directory traversal not allowed',
        output: null,
      };
    }

    const stats = await fs.stat(filePath);

    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${stats.size} bytes (max ${MAX_FILE_SIZE})`,
        output: null,
      };
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return {
      success: true,
      output: {
        content,
        size: stats.size,
        path: filePath,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null,
    };
  }
}

/**
 * Write content to a file
 * Security: Validates path, creates directories if needed
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<ToolResult> {
  try {
    if (!validatePath(filePath)) {
      return {
        success: false,
        error: 'Invalid path: directory traversal not allowed',
        output: null,
      };
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      output: {
        success: true,
        path: filePath,
        bytesWritten: content.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null,
    };
  }
}

/**
 * List directory contents
 * Security: Validates path, returns separate files and directories
 */
export async function listDirectory(dirPath: string): Promise<ToolResult> {
  try {
    if (!validatePath(dirPath)) {
      return {
        success: false,
        error: 'Invalid path: directory traversal not allowed',
        output: null,
      };
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const files: string[] = [];
    const dirs: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(entry.name);
      } else if (entry.isDirectory()) {
        dirs.push(entry.name);
      }
    }

    return {
      success: true,
      output: {
        files,
        dirs,
        path: dirPath,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null,
    };
  }
}

/**
 * Find files matching a glob pattern
 * Security: Validates path, respects ignore patterns
 */
export function glob(pattern: string): ToolResult {
  try {
    if (!validatePathSync(pattern)) {
      return {
        success: false,
        error: 'Invalid pattern: directory traversal not allowed',
        output: null,
      };
    }

    const matches = globSync(pattern, {
      nodir: true,
      dot: false,
    });

    return {
      success: true,
      output: {
        matches,
        count: matches.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to glob: ${error instanceof Error ? error.message : 'Unknown error'}`,
      output: null,
    };
  }
}

/**
 * Tool definitions for file operations
 */
export const fileTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. Maximum file size is 1MB.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        size: { type: 'number' },
        path: { type: 'string' },
      },
    },
    requiresSecureEnvironment: true,
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates directories if needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to write to' },
        content: { type: 'string', description: 'Content to write' },
      },
      required: ['path', 'content'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        path: { type: 'string' },
        bytesWritten: { type: 'number' },
      },
    },
    requiresSecureEnvironment: true,
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to list' },
      },
      required: ['path'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        dirs: { type: 'array', items: { type: 'string' } },
        path: { type: 'string' },
      },
    },
    requiresSecureEnvironment: true,
  },
  {
    name: 'glob',
    description: 'Find files matching a glob pattern.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g., "**/*.ts")',
        },
      },
      required: ['pattern'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        matches: { type: 'array', items: { type: 'string' } },
        count: { type: 'number' },
      },
    },
    requiresSecureEnvironment: true,
  },
];

// Re-export ToolResult type
export type { ToolResult } from '../types.js';
