/**
 * Context Engine Unit Tests
 * Testing Merkle tree sync, code chunking, and semantic search
 */

import { MerkleTreeSync } from '../src/context/merkle-tree-sync.js';
import { CodeChunker } from '../src/context/code-chunker.js';
import { VectorStore } from '../src/context/vector-store.js';

describe('MerkleTreeSync', () => {
  let tree: MerkleTreeSync;

  beforeEach(() => {
    tree = new MerkleTreeSync('/tmp/test-project');
  });

  test('should hash content consistently', () => {
    const hash1 = tree.hashContent('test content');
    const hash2 = tree.hashContent('test content');
    expect(hash1).toBe(hash2);
  });

  test('should generate different hashes for different content', () => {
    const hash1 = tree.hashContent('content A');
    const hash2 = tree.hashContent('content B');
    expect(hash1).not.toBe(hash2);
  });

  test('should use 3 minute sync interval', () => {
    expect(tree['syncInterval']).toBe(180000);
  });
});

describe('CodeChunker', () => {
  let chunker: CodeChunker;

  beforeEach(() => {
    chunker = new CodeChunker();
  });

  test('should detect JavaScript', () => {
    expect(chunker.detectLanguage('file.js')).toBe('javascript');
    expect(chunker.detectLanguage('file.tsx')).toBe('typescript');
  });

  test('should detect Python', () => {
    expect(chunker.detectLanguage('file.py')).toBe('python');
  });

  test('should detect Rust', () => {
    expect(chunker.detectLanguage('file.rs')).toBe('rust');
  });

  test('should chunk JavaScript code', () => {
    const content = `
function hello() {
  return 'Hello';
}

function add(a, b) {
  return a + b;
}

class MyClass {
  constructor() {}
}
`;

    const chunks = chunker.chunkContent(content, 'javascript', 'test.js');
    
    expect(chunks.length).toBeGreaterThan(0);
    const functionChunks = chunks.filter(c => c.type === 'function');
    expect(functionChunks.length).toBe(2);
  });

  test('should extract import statements', () => {
    const content = `
import React from 'react';
import { useState } from 'react';
import axios from 'axios';
`;

    const chunks = chunker.chunkContent(content, 'javascript', 'test.js');
    const importChunks = chunks.filter(c => c.type === 'import');
    expect(importChunks.length).toBe(3);
  });
});

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  test('should index chunks', async () => {
    const chunk = {
      id: 'test:hello',
      type: 'function',
      name: 'hello',
      content: 'function hello() { return "hi"; }',
      filePath: 'test.js',
      startLine: 1,
      endLine: 3,
      language: 'javascript'
    };

    await store.indexChunk(chunk);
    expect(store.chunkCount).toBe(1);
  });

  test('should perform semantic search', async () => {
    const chunks = [
      {
        id: '1',
        type: 'function' as const,
        name: 'addNumbers',
        content: 'function addNumbers(a, b) { return a + b; }',
        filePath: 'math.js',
        startLine: 1,
        endLine: 3,
        language: 'javascript'
      },
      {
        id: '2',
        type: 'function' as const,
        name: 'multiplyNumbers', 
        content: 'function multiplyNumbers(a, b) { return a * b; }',
        filePath: 'math.js',
        startLine: 5,
        endLine: 7,
        language: 'javascript'
      }
    ];

    await store.indexChunks(chunks);

    const results = await store.semanticSearch('addition operation', 2);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should calculate cosine similarity', () => {
    const storeAny = store as any;
    
    // Identical vectors
    const v1 = [1, 0, 0];
    const s1 = storeAny.cosineSimilarity(v1, v1);
    expect(s1).toBeCloseTo(1);

    // Orthogonal vectors  
    const v2 = [0, 1, 0];
    const s2 = storeAny.cosineSimilarity(v1, v2);
    expect(s2).toBeCloseTo(0);
  });

  test('should clear index', async () => {
    const chunk = {
      id: 'test:1',
      type: 'function' as const,
      name: 'test',
      content: 'test',
      filePath: 'test.js',
      startLine: 1,
      endLine: 1,
      language: 'javascript'
    };

    await store.indexChunk(chunk);
    expect(store.chunkCount).toBe(1);
    
    store.clear();
    expect(store.chunkCount).toBe(0);
  });
});

describe('Integration', () => {
  test('should handle complete workflow', async () => {
    const store = new VectorStore();
    
    // Add chunks
    await store.indexChunks([
      {
        id: 'f1',
        type: 'function',
        name: 'calculateTotal',
        content: 'function calculateTotal(prices) { return prices.reduce((a, b) => a + b, 0); }',
        filePath: 'cart.js',
        startLine: 1,
        endLine: 3,
        language: 'javascript'
      },
      {
        id: 'f2',
        type: 'function',
        name: 'formatCurrency', 
        content: 'function formatCurrency(amount) { return "$" + amount.toFixed(2); }',
        filePath: 'utils.js',
        startLine: 1,
        endLine: 2,
        language: 'javascript'
      }
    ]);

    // Search
    const results = await store.semanticSearch('sum prices', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.name).toBe('calculateTotal');
  });
});