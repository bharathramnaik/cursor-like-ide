/**
 * Tool Registry - Manages all available tools
 * Similar to Cursor's tool harness implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition>;

  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  /**
   * Register all default tools similar to Cursor
   */
  private registerDefaultTools(): void {
    // File Operations
    this.register({
      name: 'file_read',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file' }
        },
        required: ['filePath']
      },
      handler: async (params) => {
        try {
          const content = await fs.readFile(params.filePath as string, 'utf-8');
          return { success: true, output: content };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    this.register({
      name: 'file_write',
      description: 'Write or create a new file',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file' },
          content: { type: 'string', description: 'Content to write' }
        },
        required: ['filePath', 'content']
      },
      handler: async (params) => {
        try {
          await fs.writeFile(params.filePath as string, params.content as string, 'utf-8');
          return { success: true, output: `File written: ${params.filePath}` };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    this.register({
      name: 'file_edit',
      description: 'Edit a file by replacing text',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file' },
          oldString: { type: 'string', description: 'Text to replace' },
          newString: { type: 'string', description: 'Replacement text' }
        },
        required: ['filePath', 'oldString', 'newString']
      },
      handler: async (params) => {
        try {
          let content = await fs.readFile(params.filePath as string, 'utf-8');
          content = content.replace(params.oldString as string, params.newString as string);
          await fs.writeFile(params.filePath as string, content, 'utf-8');
          return { success: true, output: `File edited: ${params.filePath}` };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    this.register({
      name: 'file_delete',
      description: 'Delete a file',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to file' }
        },
        required: ['filePath']
      },
      handler: async (params) => {
        try {
          await fs.unlink(params.filePath as string);
          return { success: true, output: `File deleted: ${params.filePath}` };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    // Search Tools
    this.register({
      name: 'grep',
      description: 'Search for text patterns using regex',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern' },
          path: { type: 'string', description: 'Directory to search' }
        },
        required: ['pattern']
      },
      handler: async (params) => {
        // Simplified grep implementation
        return { success: true, output: 'Search completed (demo)' };
      }
    });

    this.register({
      name: 'glob',
      description: 'Find files matching a glob pattern',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          path: { type: 'string', description: 'Root directory' }
        },
        required: ['pattern']
      },
      handler: async (params) => {
        return { success: true, output: 'Files found (demo)' };
      }
    });

    // Terminal Commands
    this.register({
      name: 'terminal',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
          workdir: { type: 'string', description: 'Working directory' }
        },
        required: ['command']
      },
      handler: async (params) => {
        try {
          const { stdout, stderr } = await execAsync(params.command as string, {
            cwd: params.workdir as string | undefined
          });
          return { 
            success: true, 
            output: stderr ? `${stdout}\n${stderr}` : stdout 
          };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    // Git Operations
    this.register({
      name: 'git_status',
      description: 'Show git status',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repository path' }
        }
      },
      handler: async (params) => {
        try {
          const { stdout } = await execAsync('git status', {
            cwd: params.path as string | undefined
          });
          return { success: true, output: stdout };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    this.register({
      name: 'git_diff',
      description: 'Show git diff',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repository path' }
        }
      },
      handler: async (params) => {
        try {
          const { stdout } = await execAsync('git diff', {
            cwd: params.path as string | undefined
          });
          return { success: true, output: stdout || 'No changes' };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    });

    // Test runner
    this.register({
      name: 'test',
      description: 'Run tests',
      parameters: {
        type: 'object',
        properties: {
          framework: { type: 'string', enum: ['jest', 'vitest', 'pytest'] },
          pattern: { type: 'string', description: 'Test pattern' }
        }
      },
      handler: async (params) => {
        return { success: true, output: 'Tests completed (demo)' };
      }
    });

    // Builder
    this.register({
      name: 'build',
      description: 'Build the project',
      parameters: {
        type: 'object',
        properties: {
          tool: { type: 'string', enum: ['npm', 'make', 'cargo'] }
        }
      },
      handler: async (params) => {
        return { success: true, output: 'Build completed (demo)' };
      }
    });

    console.log(`[ToolRegistry] Registered ${this.tools.size} tools`);
  }

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool by name
   */
  async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${toolName}` };
    }
    return tool.handler(params);
  }

  /**
   * Get descriptions of all tools
   */
  getToolDescriptions(): string {
    const descriptions: string[] = [];
    for (const [name, tool] of this.tools) {
      descriptions.push(`- ${name}: ${tool.description}`);
    }
    return descriptions.join('\n');
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}