/**
 * Context Engine - Merkle Tree & Code Indexing
 * Implements secure, differential code synchronization
 */

import crypto from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

export class MerkleTree {
  constructor(rootPath) {
    this.rootPath = rootPath;
    this.root = null;
    this.fileHashes = new Map();
  }

  async buildTree(directoryPath = this.rootPath) {
    const entries = await readdir(directoryPath);
    const children = [];

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry);
      
      // Skip hidden files and common ignore patterns
      if (entry.startsWith('.') || this.shouldIgnore(entry)) {
        continue;
      }

      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const subtree = await this.buildTree(fullPath);
        if (subtree) {
          children.push(subtree);
        }
      } else if (stats.isFile()) {
        const hash = await this.hashFile(fullPath);
        children.push({
          type: 'file',
          path: fullPath,
          hash
        });
        this.fileHashes.set(fullPath, hash);
      }
    }

    return {
      type: 'directory',
      path: directoryPath,
      children: children,
      hash: this.hashNode(children)
    };
  }

  hashFile(filePath) {
    return crypto.createHash('sha256').update(filePath).digest('hex').substring(0, 16);
  }

  hashNode(children) {
    const combined = children.map(c => c.hash).join('');
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  shouldIgnore(name) {
    const ignores = [
      'node_modules', '.git', 'dist', 'build', 'coverage',
      '.DS_Store', 'Thumbs.db', '__pycache__'
    ];
    return ignores.includes(name);
  }

  async findDifferences(localTree, serverTree) {
    const changedFiles = [];
    
    const traverse = (local, server, path = '') => {
      if (!server) {
        // File exists locally but not on server
        if (local.type === 'file') {
          changedFiles.push({ path: local.path, type: 'add' });
        }
        return;
      }

      if (local.hash !== server.hash) {
        if (local.type === 'file') {
          changedFiles.push({ path: local.path, type: 'modify' });
        } else if (local.type === 'directory') {
          // Recurse into directories
          const localChildren = local.children || [];
          const serverChildren = (server.children || []).reduce(
            (acc, c) => { acc[c.path] = c; return acc; }, {}
          );
          
          for (const child of localChildren) {
            const childName = path.basename(child.path);
            traverse(child, serverChildren[childName], child.path);
          }
        }
      }
    };

    traverse(localTree, serverTree);
    return changedFiles;
  }
}

export class CodeChunker {
  constructor() {
    this.supportedLanguages = ['javascript', 'typescript', 'python', 'go', 'rust'];
  }

  // Parse code into logical chunks (functions, classes, imports)
  // In production: use tree-sitter for proper AST parsing
  chunkFile(sourceCode, language = 'javascript') {
    const chunks = [];
    
    // Detect function definitions
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g;
    
    let match;
    let lastIndex = 0;
    
    while ((match = functionRegex.exec(sourceCode)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      
      chunks.push({
        type: 'function',
        name: functionName,
        lineNumber: sourceCode.substring(0, match.index).split('\n').length,
        content: this.extractFunctionBody(sourceCode, match.index)
      });
    }

    return chunks;
  }

  extractFunctionBody(sourceCode, startIndex) {
    // Simplified: extract until next function or end
    const lines = sourceCode.split('\n');
    return lines.join('\n');
  }
}

export class VectorStore {
  constructor(options = {}) {
    this.provider = options.provider || 'openai';
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint;
    this.cache = new Map();
  }

  async generateEmbedding(text) {
    // In production: call actual embedding API
    // For demo: return mock vector
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }

  async indexChunk(chunk) {
    const embedding = await this.generateEmbedding(chunk.content);
    
    this.cache.set(chunk.content.substring(0, 50), {
      embedding,
      metadata: chunk
    });
  }

  async semanticSearch(query, topK = 10) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Simple similarity search
    let results = [];
    
    for (const [content, data] of this.cache.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      results.push({
        content,
        score: similarity,
        metadata: data.metadata
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }
}