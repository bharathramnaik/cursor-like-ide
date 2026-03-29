/**
 * Context-Aware Memory System
 * Persistent memory for AI agent interactions
 * Following Cursor's approach to contextual memory
 */

export interface MemoryEntry {
  id: string;
  type: 'interaction' | 'code_analysis' | 'tool_usage' | 'error_recovery';
  query: string;
  response: string;
  keyContext: string[];
  files: string[];
  timestamp: number;
  importance: number;
  embedding?: number[];
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  relevance: number;
}

export class ContextMemory {
  private storage: Map<string, MemoryEntry>;
  private maxEntries: number;
  private embeddingModel: string | null;

  constructor(options: { maxEntries?: number; embeddingModel?: string } = {}) {
    this.storage = new Map();
    this.maxEntries = options.maxEntries || 1000;
    this.embeddingModel = options.embeddingModel || null;
  }

  /**
   * Store a new interaction in memory
   */
  async storeInteraction(
    query: string,
    response: string,
    context: {
      keyContext?: string[];
      files?: string[];
      type?: MemoryEntry['type'];
    } = {}
  ): Promise<string> {
    const id = this.generateId();
    const importance = this.calculateImportance(query, response);

    const entry: MemoryEntry = {
      id,
      type: context.type || 'interaction',
      query,
      response,
      keyContext: context.keyContext || [],
      files: context.files || [],
      timestamp: Date.now(),
      importance
    };

    // Generate embedding if model available
    if (this.embeddingModel) {
      entry.embedding = await this.generateEmbedding(query + ' ' + response);
    }

    this.storage.set(id, entry);

    // Check if we need to prune old entries
    if (this.storage.size > this.maxEntries) {
      await this.pruneOldEntries();
    }

    console.log(`[Memory] Stored interaction: ${id}`);
    return id;
  }

  /**
   * Retrieve relevant memories based on query
   */
  async retrieveRelevantMemory(query: string, topK: number = 5): Promise<MemorySearchResult[]> {
    if (this.storage.size === 0) {
      return [];
    }

    // Generate query embedding
    const queryEmbedding = this.embeddingModel 
      ? await this.generateEmbedding(query)
      : this.generateSimpleEmbedding(query);

    const results: MemorySearchResult[] = [];

    for (const entry of this.storage.values()) {
      let relevance: number;

      if (entry.embedding) {
        // Use semantic similarity
        relevance = this.cosineSimilarity(queryEmbedding, entry.embedding);
      } else {
        // Fallback to keyword matching
        relevance = this.keywordSimilarity(query, entry.query + ' ' + entry.response);
      }

      // Boost relevance based on importance and recency
      const timeFactor = this.calculateTimeDecay(entry.timestamp);
      const importanceBoost = entry.importance * 0.1;
      relevance = relevance * timeFactor + importanceBoost;

      if (relevance > 0.1) {
        results.push({ entry, relevance });
      }
    }

    // Sort by relevance and return top K
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, topK);
  }

  /**
   * Get memories related to specific files
   */
  async getFileRelatedMemories(filePath: string): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];

    for (const entry of this.storage.values()) {
      if (entry.files.includes(filePath)) {
        results.push(entry);
      }
    }

    // Sort by recency
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results;
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(count: number = 10): Promise<MemoryEntry[]> {
    const entries = Array.from(this.storage.values());
    
    // Sort by timestamp (most recent first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    return entries.slice(0, count);
  }

  /**
   * Calculate memory importance score
   */
  private calculateImportance(query: string, response: string): number {
    let importance = 0.5; // Base importance

    // Boost for error-related interactions (high value to remember)
    if (/error|bug|fix|issue/i.test(query)) {
      importance += 0.3;
    }

    // Boost for new functionality
    if (/create|implement|new feature/i.test(query)) {
      importance += 0.2;
    }

    // Boost for complex operations
    if (query.length > 200 || response.length > 500) {
      importance += 0.1;
    }

    return Math.min(1, importance);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Time-based decay for older memories
   */
  private calculateTimeDecay(timestamp: number): number {
    const hoursOld = (Date.now() - timestamp) / (1000 * 60 * 60);
    
    // Decay over time - memories become less relevant
    if (hoursOld < 1) return 1;
    if (hoursOld < 24) return 0.9;
    if (hoursOld < 168) return 0.7; // 1 week
    if (hoursOld < 720) return 0.5; // 1 month
    
    return 0.3;
  }

  /**
   * Generate simple embedding for keyword matching
   */
  private generateSimpleEmbedding(text: string): number[] {
    const vector = new Array(128).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, idx) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      vector[idx % 128] += Math.abs(hash) % 1000 / 1000;
    });

    // Normalize
    const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / mag);
  }

  /**
   * Generate embedding (placeholder for real implementation)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // In production, would call OpenAI or local embedding model
    return this.generateSimpleEmbedding(text);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
  }

  /**
   * Keyword-based similarity fallback
   */
  private keywordSimilarity(query: string, content: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const contentWords = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    if (queryWords.size === 0) return 0;
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.has(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.size;
  }

  /**
   * Prune old/low-importance entries when storage is full
   */
  private async pruneOldEntries(): Promise<void> {
    const entries = Array.from(this.storage.values());
    
    // Calculate importance score including recency
    const scoredEntries = entries.map(entry => ({
      ...entry,
      score: entry.importance * this.calculateTimeDecay(entry.timestamp)
    }));
    
    // Sort by score (lowest first)
    scoredEntries.sort((a, b) => a.score - b.score);
    
    // Remove bottom 20%
    const toRemove = Math.floor(scoredEntries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.storage.delete(scoredEntries[i].id);
    }

    console.log(`[Memory] Pruned ${toRemove} old entries`);
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    this.storage.clear();
    console.log('[Memory] All memories cleared');
  }

  /**
   * Export memories to JSON
   */
  exportMemories(): string {
    return JSON.stringify(Array.from(this.storage.values()), null, 2);
  }

  /**
   * Import memories from JSON
   */
  importMemories(json: string): void {
    try {
      const entries = JSON.parse(json) as MemoryEntry[];
      entries.forEach(entry => {
        this.storage.set(entry.id, entry);
      });
      console.log(`[Memory] Imported ${entries.length} memories`);
    } catch (error) {
      console.error('[Memory] Import failed:', error);
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const entry of this.storage.values()) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    return {
      total: this.storage.size,
      byType
    };
  }
}

export default ContextMemory;