/**
 * Context Manager - Central Hub for Codebase Understanding
 * Coordinates Merkle tree sync, code indexing, and semantic search
 * Following Cursor's approach to context-aware AI assistance
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { watch, FSWatcher } from 'chokidar';
import { MerkleTreeSync, FileNode } from './merkle-tree-sync.js';
import { CodeChunker, CodeChunk } from './code-chunker.js';
import { VectorStore, IndexableChunk, SearchResult } from './vector-store.js';

export interface ContextConfig {
  rootPath: string;
  syncInterval?: number;
  maxContextTokens?: number;
}

export interface ContextSummary {
  totalFiles: number;
  totalChunks: number;
  lastSync: string;
  indexedLanguages: string[];
}

export class ContextManager {
  private config: ContextConfig;
  private merkleTree: MerkleTreeSync;
  private chunker: CodeChunker;
  private vectorStore: VectorStore;
  private watcher: FSWatcher | null = null;
  private isIndexing: boolean = false;
  private lastSyncTime: Date | null = null;

  constructor(config: ContextConfig) {
    this.config = {
      syncInterval: 3 * 60 * 1000, // 3 minutes
      maxContextTokens: 13000,
      ...config
    };

    this.merkleTree = new MerkleTreeSync(config.rootPath);
    this.chunker = new CodeChunker();
    this.vectorStore = new VectorStore();
  }

  /**
   * Initialize context indexing
   */
  async initialize(): Promise<void> {
    console.log('[ContextManager] Initializing...');
    
    // Build initial index
    await this.buildIndex();
    
    // Start file watching for live updates
    this.startFileWatching();
    
    // Start periodic sync
    this.merkleTree.startPeriodicSync(async () => {
      if (!this.isIndexing) {
        await this.incrementalSync();
      }
    });
    
    console.log('[ContextManager] Initialized successfully');
  }

  /**
   * Build complete code index
   */
  async buildIndex(): Promise<void> {
    this.isIndexing = true;
    
    try {
      console.log('[ContextManager] Building code index...');
      
      // Index all source files
      const chunks = await this.chunker.indexDirectory(this.config.rootPath);
      
      // Add to vector store
      await this.vectorStore.indexChunks(chunks.map(c => ({ ...c })));
      
      console.log(`[ContextManager] Indexed ${chunks.length} code chunks`);
      
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('[ContextManager] Index build error:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Incrementally sync changed files
   */
  async incrementalSync(): Promise<void> {
    this.isIndexing = true;
    
    try {
      console.log('[ContextManager] Performing incremental sync...');
      
      const changedFiles = await this.merkleTree.getChangedFiles();
      
      for (const filePath of changedFiles) {
        // Re-index changed files
        try {
          const chunks = await this.chunker.chunkFile(filePath);
          await this.vectorStore.indexChunks(chunks.map(c => ({ ...c })));
        } catch (e) {
          // Skip files that can't be re-indexed
        }
      }
      
      console.log(`[ContextManager] Synced ${changedFiles.length} files`);
      this.lastSyncTime = new Date();
    } catch (error) {
      console.error('[ContextManager] Sync error:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Start watching for file changes
   */
  private startFileWatching(): void {
    this.watcher = watch(this.config.rootPath, {
      ignored: /(^|[\/\\])\.|node_modules|dist|build/,
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('change', async (filePath) => {
        console.log(`[ContextManager] File changed: ${filePath}`);
        // Debounce re-indexing could be added here
      })
      .on('add', (filePath) => {
        console.log(`[ContextManager] File added: ${filePath}`);
      })
      .on('unlink', (filePath) => {
        console.log(`[ContextManager] File removed: ${filePath}`);
      });
  }

  /**
   * Search codebase semantically
   */
  async searchCodebase(query: string, topK: number = 10): Promise<SearchResult[]> {
    return await this.vectorStore.semanticSearch(query, topK);
  }

  /**
   * Get relevant context for a query
   */
  async getRelevantContext(query: string, maxTokens?: number): Promise<string> {
    const results = await this.searchCodebase(query, 5);
    
    if (results.length === 0) {
      return 'No relevant context found';
    }

    // Build context from results
    let context = `# Relevant Code Context\n\n`;
    
    for (const result of results) {
      context += `## ${result.chunk.name} (${result.chunk.filePath}:${result.chunk.startLine})\n`;
      context += `Relevance: ${(result.score * 100).toFixed(1)}%\n\n`;
      context += result.context;
      context += '\n\n---\n\n';
    }

    // Trim to fit token limit
    const tokenLimit = maxTokens || this.config.maxContextTokens || 13000;
    if (context.length > tokenLimit * 4) {
      context = context.substring(0, tokenLimit * 4) + '\n\n[Context truncated...]';
    }

    return context;
  }

  /**
   * Get summary of indexed codebase
   */
  async getSummary(): Promise<ContextSummary> {
    const chunks: IndexableChunk[] = [];
    // Note: vectorStore.chunks is private, using chunkCount
    const chunkCount = (this.vectorStore as any).chunks?.size || 0;
    
    return {
      totalFiles: 0, // Would need separate tracking
      totalChunks: chunkCount,
      lastSync: this.lastSyncTime?.toISOString() || 'Never',
      indexedLanguages: Array.from(this.chunker['supportedLanguages'].keys())
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.vectorStore.clear();
    console.log('[ContextManager] Shutdown complete');
  }
}

export default ContextManager;