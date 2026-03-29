/**
 * Code Chunker - Semantic Code Indexing
 * Uses AST parsing to extract logical code units
 * Similar to Cursor's approach of chunking at function/class boundaries
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export interface CodeChunk {
  id: string;
  type: 'function' | 'class' | 'method' | 'import' | 'variable' | 'interface' | 'type';
  name: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
}

export interface IndexableChunk extends CodeChunk {
  embedding?: number[];
}

/**
 * Simple code chunker that extracts semantic units
 * Uses regex-based parsing for demo (tree-sitter integration available)
 */
export class CodeChunker {
  private supportedLanguages: Map<string, RegExp[]>;

  constructor() {
    this.supportedLanguages = new Map([
      // JavaScript/TypeScript
      ['javascript', [
        /function\s+(\w+)\s*\([^)]*\)\s*\{/g,
        /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
        /class\s+(\w+)/g,
        /import\s+.*?from\s+['"](.+?)['"]/g,
        /export\s+(?:default\s+)?(?:function|class|const)/g
      ]],
      ['typescript', [
        /function\s+(\w+)\s*\([^)]*\)\s*(?::\w+)?\s*\{/g,
        /(?:const|let)\s+(\w+)\s*:\s*(?:(?:function|class)\w*|[\w<>[\]|]+)/g,
        /class\s+(\w+)/g,
        /interface\s+(\w+)/g,
        /type\s+(\w+)\s*=/g,
        /import\s+.*?from\s+['"](.+?)['"]/g
      ]],
      // Python
      ['python', [
        /def\s+(\w+)\s*\(/g,
        /class\s+(\w+)/g,
        /import\s+(\w+)/g,
        /from\s+(\w+)\s+import/g
      ]],
      // Rust
      ['rust', [
        /fn\s+(\w+)\s*\(/g,
        /struct\s+(\w+)/g,
        /impl\s+(\w+)/g,
        /use\s+(\w+)/g,
        /pub\s+(?:fn|struct|impl)/g
      ]],
      // Go
      ['go', [
        /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g,
        /type\s+(\w+)\s+struct/g,
        /type\s+(\w+)\s+interface/g,
        /import\s+(?:"[^"]+"|\([^)]+\))/g
      ]]
    ]);
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c'
    };
    return map[ext] || 'unknown';
  }

  /**
   * Chunk a source file into logical units
   */
  async chunkFile(filePath: string): Promise<CodeChunk[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    
    return this.chunkContent(content, language, filePath);
  }

  /**
   * Chunk content without reading from file
   */
  chunkContent(content: string, language: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    const patterns = this.supportedLanguages.get(language) || [];
    
    // Simple line-by-line analysis
    let currentChunk: Partial<CodeChunk> | null = null;
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Detect function/method definitions
      if (/^(export\s+)?(?:async\s+)?(?:function|const|let)\s+/.test(line) || 
          /^(public|private|protected)?\s*function/.test(line)) {
        
        // Save previous chunk
        if (currentChunk && currentChunk.name) {
          currentChunk.endLine = lineNumber - 1;
          currentChunk.content = lines.slice(
            (currentChunk.startLine || 1) - 1, 
            currentChunk.endLine - 1
          ).join('\n');
          chunks.push(currentChunk as CodeChunk);
        }
        
        // Start new chunk
        const nameMatch = line.match(/(?:function|const|let)\s+(\w+)/);
        currentChunk = {
          id: `${filePath}:${nameMatch?.[1] || lineNumber}`,
          type: 'function',
          name: nameMatch?.[1] || `line_${lineNumber}`,
          filePath,
          startLine: lineNumber,
          language
        };
      }
      
      // Detect class definitions
      if (/^class\s+(\w+)/.test(line)) {
        if (currentChunk && currentChunk.name) {
          currentChunk.endLine = lineNumber - 1;
          chunks.push(currentChunk as CodeChunk);
        }
        
        const nameMatch = line.match(/class\s+(\w+)/);
        currentChunk = {
          id: `${filePath}:${nameMatch?.[1]}`,
          type: 'class',
          name: nameMatch?.[1] || '',
          filePath,
          startLine: lineNumber,
          language
        };
      }
      
      // Detect import statements
      if (/^import\s+/.test(line)) {
        const nameMatch = line.match(/import\s+(?:.*?\s+from\s+)?['"](.+?)['"]/);
        if (nameMatch) {
          chunks.push({
            id: `${filePath}:import:${nameMatch[1]}`,
            type: 'import',
            name: nameMatch[1],
            content: line,
            filePath,
            startLine: lineNumber,
            endLine: lineNumber,
            language
          });
        }
      }
    });
    
    // Add final chunk
    if (currentChunk && currentChunk.name) {
      currentChunk.endLine = lines.length;
      currentChunk.content = lines.slice(
        (currentChunk.startLine || 1) - 1,
        lines.length
      ).join('\n');
      chunks.push(currentChunk as CodeChunk);
    }

    return chunks;
  }

  /**
   * Index entire directory
   */
  async indexDirectory(dirPath: string): Promise<IndexableChunk[]> {
    const allChunks: IndexableChunk[] = [];
    const files = await this.walkDirectory(dirPath);
    
    for (const file of files) {
      try {
        const chunks = await this.chunkFile(file);
        allChunks.push(...chunks.map(c => ({ ...c })));
      } catch (e) {
        console.log(`[CodeChunker] Skipping ${file}: ${e}`);
      }
    }
    
    return allChunks;
  }

  /**
   * Walk directory recursively
   */
  private async walkDirectory(dirPath: string, files: string[] = []): Promise<string[]> {
    const entries = await fs.readDir(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // Skip ignored directories
        if (!/node_modules|\.git|dist|build/.test(entry.name)) {
          await this.walkDirectory(fullPath, files);
        }
      } else if (stat.isFile()) {
        // Only index source files
        if (/\.(ts|js|py|rs|go|java|cpp|c)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }
}

export default CodeChunker;