/**
 * @baniya/agents - Security Sandbox
 *
 * Provides security validations for tool execution.
 */

import path from 'path';

// Default allowed base directories (can be configured)
let allowedBaseDirs: string[] = [];

/**
 * Configure allowed base directories for file operations
 */
export function setAllowedBaseDirs(dirs: string[]): void {
  allowedBaseDirs = dirs.map(d => path.normalize(d));
}

/**
 * Get current allowed base directories
 */
export function getAllowedBaseDirs(): string[] {
  return [...allowedBaseDirs];
}

/**
 * Add an allowed base directory
 */
export function addAllowedBaseDir(dir: string): void {
  const normalized = path.normalize(dir);
  if (!allowedBaseDirs.includes(normalized)) {
    allowedBaseDirs.push(normalized);
  }
}

/**
 * Validate a file path to prevent directory traversal
 * Security: Blocks paths containing ".." or starting with "/"
 */
export function validatePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  const normalized = path.normalize(filePath);

  // Block directory traversal attempts
  if (normalized.includes('..')) {
    return false;
  }

  // Block absolute paths outside allowed directories
  if (path.isAbsolute(normalized)) {
    if (allowedBaseDirs.length > 0) {
      return allowedBaseDirs.some(dir => normalized.startsWith(dir));
    }
    return false;
  }

  return true;
}

/**
 * Synchronous path validation (for glob)
 */
export function validatePathSync(pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  // Check for directory traversal
  if (pattern.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Command whitelist - allowed commands
 */
const ALLOWED_COMMANDS = new Set([
  'git',
  'node',
  'pnpm',
  'npm',
  'python',
  'python3',
  'cat',
  'ls',
  'echo',
  'mkdir',
  'grep',
  'rg',
  'find',
  'touch',
  'pwd',
  'whoami',
  'stat',
  'head',
  'tail',
  'wc',
  'sort',
  'uniq',
  'cut',
  'awk',
  'sed',
]);

/**
 * Dangerous command patterns to block
 */
const BLOCKED_PATTERNS = [
  /rm\s+-rf/,
  /rm\s+-r/,
  /rm\s+-f/,
  /curl\s*\|\s*sh/,
  /wget\s*\|\s*sh/,
  /sudo\s+/,
  /ssh\s+/,
  /chmod\s+777/,
  /chown\s+-R/,
  /dd\s+if=/,
  /mkfs/,
  /:(){ :|:& };:/, // Fork bomb
  /eval\s+/,
  /exec\s+/,
];

/**
 * Validate a command against security rules
 * Security: Whitelist approach with pattern blocking
 */
export function validateCommand(command: string): boolean {
  if (!command || typeof command !== 'string') {
    return false;
  }

  const trimmed = command.trim().toLowerCase();

  // Check blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Extract the base command
  const parts = trimmed.split(/\s+/);
  const baseCmd = parts[0].replace(/^.*\//, ''); // Remove path

  // Check against whitelist
  return ALLOWED_COMMANDS.has(baseCmd);
}

/**
 * Get list of allowed commands
 */
export function getAllowedCommands(): string[] {
  return Array.from(ALLOWED_COMMANDS);
}

/**
 * Check if a command is blocked
 */
export function isCommandBlocked(command: string): boolean {
  return !validateCommand(command);
}

/**
 * Default timeout for tool execution (30 seconds)
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Apply timeout to an async operation
 */
export async function applyTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Sandbox class for secure tool execution
 */
export class Sandbox {
  private baseDirs: string[];
  private timeoutMs: number;

  constructor(options?: { baseDirs?: string[]; timeoutMs?: number }) {
    this.baseDirs = options?.baseDirs ?? [];
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Execute a tool with validation
   */
  async execute<T>(
    toolName: string,
    params: Record<string, unknown>,
    executor: (params: Record<string, unknown>) => Promise<T>
  ): Promise<{ success: boolean; output?: T; error?: string }> {
    try {
      // Add base dirs to sandbox
      this.baseDirs.forEach(dir => addAllowedBaseDir(dir));

      const result = await applyTimeout(executor(params), this.timeoutMs);
      return { success: true, output: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate a path
   */
  validatePath(p: string): boolean {
    return validatePath(p);
  }

  /**
   * Validate a command
   */
  validateCommand(cmd: string): boolean {
    return validateCommand(cmd);
  }

  /**
   * Get timeout setting
   */
  getTimeout(): number {
    return this.timeoutMs;
  }

  /**
   * Set timeout
   */
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }
}
