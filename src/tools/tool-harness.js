import { ToolSchema } from './tool-types.js';
import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
import path from 'path';
import { glob as globSync } from 'glob';

const execAsync = promisify(exec);
const globAsync = promisify(glob);

export class ToolResult {
  constructor(success, output, error = null) {
    this.success = success;
    this.output = output;
    this.error = error;
  }
  
  static success(output) {
    return new ToolResult(true, output);
  }
  
  static error(error) {
    return new ToolResult(false, null, error);
  }
}

export class ToolHarness {
  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }
  
  initializeTools() {
    // Register all available tools
    this.tools.set('file_read', this.fileRead.bind(this));
    this.tools.set('file_write', this.fileWrite.bind(this));
    this.tools.set('file_edit', this.fileEdit.bind(this));
    this.tools.set('terminal_execute', this.terminalExecute.bind(this));
    this.tools.set('semantic_search', this.semanticSearch.bind(this));
    this.tools.set('grep_search', this.grepSearch.bind(this));
    this.tools.set('list_directory', this.listDirectory.bind(this));
    this.tools.set('get_file_info', this.getFileInfo.bind(this));
    
    console.log('🔧 Tool harness initialized with 8 tools');
  }
  
  async initialize() {
    // Any async initialization if needed
    return true;
  }
  
  async executeTool(toolName, parameters) {
    const toolFunction = this.tools.get(toolName);
    
    if (!toolFunction) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    try {
      // Validate parameters against schema (simplified validation)
      const result = await toolFunction(parameters);
      return result;
    } catch (error) {
      return ToolResult.error(error.message);
    }
  }
  
  // Tool implementations
  async fileRead({ filePath }) {
    try {
      const content = await readFile(filePath, 'utf8');
      return ToolResult.success(content);
    } catch (error) {
      return ToolResult.error(`Failed to read file: ${error.message}`);
    }
  }
  
  async fileWrite({ filePath, content }) {
    try {
      await writeFile(filePath, content, 'utf8');
      return ToolResult.success(`Successfully wrote to ${filePath}`);
    } catch (error) {
      return ToolResult.error(`Failed to write file: ${error.message}`);
    }
  }
  
  async fileEdit({ filePath, oldString, newString, replaceAll = false }) {
    try {
      let content = await readFile(filePath, 'utf8');
      
      if (replaceAll) {
        const regex = new RegExp(oldString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, newString);
      } else {
        content = content.replace(oldString, newString);
      }
      
      await writeFile(filePath, content, 'utf8');
      return ToolResult.success(`Successfully edited ${filePath}`);
    } catch (error) {
      return ToolResult.error(`Failed to edit file: ${error.message}`);
    }
  }
  
  async terminalExecute({ command, workdir = '.', timeout = 30000 }) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workdir,
        timeout: timeout
      });
      
      const output = stderr ? `${stdout}\n${stderr}` : stdout;
      return ToolResult.success(output.trim());
    } catch (error) {
      return ToolResult.error(`Command failed: ${error.message}`);
    }
  }
  
  async semanticSearch({ query, path = '.' }) {
    try {
      // Simplified semantic search - in a real implementation, this would use embeddings
      // For now, we'll use a basic text search as a placeholder
      const files = await globAsync('**/*', { 
        cwd: path,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
      });
      
      const results = [];
      for (const file of files) {
        try {
          const fullPath = path.join(path, file);
          const content = await readFile(fullPath, 'utf8');
          
          // Simple relevance scoring based on term frequency
          const terms = query.toLowerCase().split(/\s+/);
          let score = 0;
          const lowerContent = content.toLowerCase();
          
          for (const term of terms) {
            if (term.length > 2) { // Ignore very short terms
              const matches = (lowerContent.match(new RegExp(term, 'g')) || []).length;
              score += matches;
            }
          }
          
          if (score > 0) {
            results.push({
              file: fullPath,
              score,
              snippet: content.substring(0, 200) + '...'
            });
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
      
      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      
      if (results.length === 0) {
        return ToolResult.success('No results found');
      }
      
      const formattedResults = results.slice(0, 10).map(r => 
        `${r.file} (score: ${r.score})\n${r.snippet}`
      ).join('\n\n');
      
      return ToolResult.success(formattedResults);
    } catch (error) {
      return ToolResult.error(`Search failed: ${error.message}`);
    }
  }
  
  async grepSearch({ pattern, path = '.', include }) {
    try {
      // Build glob pattern
      let globPattern = '**/*';
      if (include) {
        globPattern = `**/${include}`;
      }
      
      const files = await globAsync(globPattern, { 
        cwd: path,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
      });
      
      const regex = new RegExp(pattern);
      const results = [];
      
      for (const file of files) {
        try {
          const fullPath = path.join(path, file);
          const content = await readFile(fullPath, 'utf8');
          const lines = content.split('\n');
          
          const matches = [];
          lines.forEach((line, lineIndex) => {
            if (regex.test(line)) {
              matches.push({
                lineNumber: lineIndex + 1,
                lineContent: line
              });
            }
          });
          
          if (matches.length > 0) {
            results.push({
              file: fullPath,
              matches
            });
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
      
      if (results.length === 0) {
        return ToolResult.success('No matches found');
      }
      
      const formattedResults = results.map(r => {
        const matchInfo = r.matches.slice(0, 5).map(m => 
          `Line ${m.lineNumber}: ${m.lineContent}`
        ).join('\n');
        
        const moreMatches = r.matches.length > 5 ? 
          `\n  ... and ${r.matches.length - 5} more matches` : '';
          
        return `${r.file}:\n${matchInfo}${moreMatches}`;
      }).join('\n\n');
      
      return ToolResult.success(formattedResults);
    } catch (error) {
      return ToolResult.error(`Grep search failed: ${error.message}`);
    }
  }
  
  async listDirectory({ directoryPath }) {
    try {
      const files = await readdirPromise(directoryPath);
      
      const fileDetails = [];
      for (const file of files) {
        try {
          const fullPath = path.join(directoryPath, file);
          const stats = await statPromise(fullPath);
          
          fileDetails.push({
            name: file,
            path: fullPath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          });
        } catch (e) {
          // Skip files that can't be accessed
        }
      }
      
      // Sort directories first, then files
      fileDetails.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return b.isDirectory ? -1 : 1; // Directories first
      });
      
      const formatted = fileDetails.map(f => {
        const type = f.isDirectory ? '📁' : '📄';
        const size = f.isDirectory ? '' : `(${this.formatBytes(f.size)})`;
        return `${type} ${f.name} ${size}`;
      }).join('\n');
      
      return ToolResult.success(formatted || 'Directory is empty');
    } catch (error) {
      return ToolResult.error(`Failed to list directory: ${error.message}`);
    }
  }
  
  async getFileInfo({ filePath }) {
    try {
      const stats = await statPromise(filePath);
      
      return ToolResult.success(`
        Path: ${filePath}
        Size: ${this.formatBytes(stats.size)}
        Created: ${stats.birthtime}
        Modified: ${stats.mtime}
        Accessed: ${stats.atime}
        Is File: ${stats.isFile()}
        Is Directory: ${stats.isDirectory()}
      `);
    } catch (error) {
      return ToolResult.error(`Failed to get file info: ${error.message}`);
    }
  }
  
  // Helper methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  async shutdown() {
    console.log('🔧 Tool harness shut down');
  }
}

// Promisified fs functions
const { readdir, stat } = require('fs/promises');
const readdirPromise = readdir;
const statPromise = stat;