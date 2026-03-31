/**
 * @baniya/agents - Template storage with CRUD operations
 */

import type { AgentTemplate } from './types.js';
import { validateTemplateOrThrow } from './validator.js';

export interface AgentStorageOptions {
  /** Base directory for file-based persistence */
  basePath?: string;
  /** Enable file-based persistence */
  persistToDisk?: boolean;
}

/**
 * Agent storage class
 * Provides CRUD operations for agent templates with optional file-based persistence
 */
export class AgentStorage {
  private templates: Map<string, AgentTemplate> = new Map();
  private basePath?: string;
  private persistToDisk: boolean;

  constructor(options: AgentStorageOptions = {}) {
    this.basePath = options.basePath;
    this.persistToDisk = options.persistToDisk ?? false;
  }

  /**
   * Save an agent template
   * @param template - Agent template to save
   * @throws Error if validation fails
   */
  async save(template: AgentTemplate): Promise<void> {
    // Validate the template
    const validated = validateTemplateOrThrow(template);

    // Store in memory
    this.templates.set(validated.name, validated);

    // Optionally persist to disk
    if (this.persistToDisk && this.basePath) {
      await this.persistTemplate(validated);
    }
  }

  /**
   * Get a template by name
   * @param name - Template name
   * @returns The template or undefined if not found
   */
  async get(name: string): Promise<AgentTemplate | undefined> {
    return this.templates.get(name);
  }

  /**
   * List all stored templates
   * @returns Array of all templates
   */
  async list(): Promise<AgentTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * Delete a template by name
   * @param name - Template name to delete
   * @returns true if deleted, false if not found
   */
  async delete(name: string): Promise<boolean> {
    const existed = this.templates.has(name);
    this.templates.delete(name);

    if (this.persistToDisk && this.basePath && existed) {
      await this.deleteTemplateFile(name);
    }

    return existed;
  }

  /**
   * Check if a template exists
   * @param name - Template name
   * @returns true if exists
   */
  async exists(name: string): Promise<boolean> {
    return this.templates.has(name);
  }

  /**
   * Get the count of stored templates
   * @returns Number of templates
   */
  count(): number {
    return this.templates.size;
  }

  /**
   * Clear all templates (for testing)
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Load templates from disk (for initialization)
   */
  async loadFromDisk(): Promise<void> {
    if (!this.persistToDisk || !this.basePath) {
      return;
    }

    try {
      const { readFile, readdir, mkdir } = await import('fs/promises');
      const { join, basename } = await import('path');

      try {
        await mkdir(this.basePath, { recursive: true });
      } catch {
        // Directory already exists
      }

      const files = await readdir(this.basePath);
      const yamlFiles = files.filter(
        f => f.endsWith('.yaml') || f.endsWith('.yml')
      );

      for (const file of yamlFiles) {
        try {
          const content = await readFile(join(this.basePath, file), 'utf-8');
          // Import parser dynamically to avoid circular dependencies
          const { parseTemplate } = await import('./parser.js');
          const template = parseTemplate(content);
          this.templates.set(template.name, template);
        } catch (err) {
          console.warn(`Failed to load template from ${file}:`, err);
        }
      }
    } catch (err) {
      console.warn('Failed to load templates from disk:', err);
    }
  }

  /**
   * Persist a single template to disk
   */
  private async persistTemplate(template: AgentTemplate): Promise<void> {
    if (!this.basePath) return;

    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    try {
      await mkdir(this.basePath, { recursive: true });
    } catch {
      // Directory exists
    }

    // Import parser dynamically
    const { serializeTemplate } = await import('./parser.js');
    const content = serializeTemplate(template);
    const fileName = `${template.name}.yaml`;
    await writeFile(join(this.basePath, fileName), content, 'utf-8');
  }

  /**
   * Delete a template file from disk
   */
  private async deleteTemplateFile(name: string): Promise<void> {
    if (!this.basePath) return;

    const { unlink } = await import('fs/promises');
    const { join } = await import('path');

    try {
      await unlink(join(this.basePath, `${name}.yaml`));
    } catch {
      // File may not exist
    }
  }
}

/**
 * Default storage instance (in-memory only)
 */
export const defaultStorage = new AgentStorage();
