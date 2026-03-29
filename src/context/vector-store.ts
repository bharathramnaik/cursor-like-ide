/**
 * Vector Store - Semantic Search Implementation
 * Provides similarity-based code search using embeddings
 * Designed to work with OpenAI embeddings or local models
 */

import { LLMFactory, LLMInterface } from '../llm/llm-interface.js';

export interface SearchResult {
  chunk: IndexableChunk;
  score: number;
  context: string;
}

export interface IndexableChunk {
  id: string;
  type: string;
  name: string;
  content: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  embedding?: number[];
}

export class VectorStore {
  private chunks: Map<string, IndexableChunk>;
  private llm: LLMInterface | null;
  private embeddingModel: string;

  constructor(options: { provider?: 'openai' | 'anthropic'; apiKey?: string } = {}) {
    this.chunks = new Map();
    this.embeddingModel = 'text-embedding-ada-002';
    this.llm = null;

    if (options.apiKey && options.provider) {
      this.llm = LLMFactory.create({
        provider: options.provider,
        apiKey: options.apiKey,
        defaultModel: this.embeddingModel
      });
    }
  }

  /**
   * Index a code chunk
   */
  async indexChunk(chunk: IndexableChunk): Promise<void> {
    // Generate embedding if available
    if (this.llm) {
      try {
        const embedding = await this.llm.embedding(chunk.content);
        chunk.embedding = embedding;
      } catch (e) {
        console.log('[VectorStore] Using fallback embedding');
        chunk.embedding = this.generateFallbackEmbedding(chunk.content);
      }
    } else {
      chunk.embedding = this.generateFallbackEmbedding(chunk.content);
    }

    this.chunks.set(chunk.id, chunk);
  }

  /**
   * Index multiple chunks
   */
  async indexChunks(chunks: IndexableChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.indexChunk(chunk);
    }
  }

  /**
   * Simple fallback embedding (for demo without API)
   */
  private generateFallbackEmbedding(text: string): number[] {
    // Simple hash-based embedding as fallback
    const vector = new Array(1536).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % 1536] += text.charCodeAt(i);
    }
    // Normalize
    const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / mag);
  }

  /**
   * Semantic search
   */
  async semanticSearch(query: string, topK: number = 10): Promise<SearchResult[]> {
    // Generate query embedding
    let queryEmbedding: number[];
    
    if (this.llm) {
      try {
        queryEmbedding = await this.llm.embedding(query);
      } catch {
        queryEmbedding = this.generateFallbackEmbedding(query);
      }
    } else {
      queryEmbedding = this.generateFallbackEmbedding(query);
    }

    // Calculate similarities
    const results: SearchResult[] = [];
    
    for (const [, chunk] of this.chunks) {
      if (!chunk.embedding) continue;
      
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      results.push({
        chunk,
        score: similarity,
        context: this.getContextSnippet(chunk.content, query)
      });
    }

    // Sort by score and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }

  /**
   * Get relevant snippet around matching terms
   */
  private getContextSnippet(content: string, query: string): string {
    const terms = query.toLowerCase().split(/\s+/);
    const lines = content.split('\n');
    
    for (const term of terms) {
      if (term.length < 3) continue;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(term)) {
          // Return context around match (5 lines before/after)
          const start = Math.max(0, i - 3);
          const end = Math.min(lines.length, i + 4);
          return lines.slice(start, end).join('\n');
        }
      }
    }

    // Return first 10 lines as default
    return lines.slice(0, 10).join('\n');
  }

  /**
   * Get chunk count
   */
  get chunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Clear index
   */
  clear(): void {
    this.chunks.clear();
  }
}

export default VectorStore;