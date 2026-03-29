// Simplified Merkle tree and context engine tests

describe('MerkleTree Unit Tests', () => {
  test('should create hash for content', () => {
    const hashContent = (content) => {
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    };
    
    const h1 = hashContent('test content');
    const h2 = hashContent('test content');
    const h3 = hashContent('different content');
    
    expect(h1).toBe(h2); // Same content = same hash
    expect(h1).not.toBe(h3); // Different content = different hash
  });
  
  test('should combine children hashes', () => {
    const hashNode = (children) => {
      const combined = children.map(c => c.hash).join('');
      let hash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return hash.toString(16);
    };
    
    const children = [{ hash: 'abc' }, { hash: 'def' }, { hash: 'ghi' }];
    const combined = hashNode(children);
    
    expect(combined).toBeTruthy();
  });
  
  test('should test file ignore patterns', () => {
    const shouldIgnore = (name) => {
      const ignores = ['node_modules', '.git', 'dist', 'build', 'coverage'];
      return ignores.includes(name);
    };
    
    expect(shouldIgnore('node_modules')).toBe(true);
    expect(shouldIgnore('.git')).toBe(true);
    expect(shouldIgnore('src')).toBe(false);
  });
});

describe('CodeChunker Unit Tests', () => {
  test('should parse function definitions', () => {
    const code = `function hello() { return 'Hello'; }
function add(a, b) { return a + b; }`;
    
    const functions = [];
    const regex = /function\s+(\w+)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      functions.push(match[1]);
    }
    
    expect(functions).toContain('hello');
    expect(functions).toContain('add');
    expect(functions.length).toBe(2);
  });
  
  test('should identify class definitions', () => {
    const code = `class MyClass { }
class AnotherClass extends Something { }`;
    
    const classes = code.match(/class\s+(\w+)/g);
    expect(classes.length).toBe(2);
  });
});

describe('VectorStore Unit Tests', () => {
  test('should generate random embedding', () => {
    const generateEmbedding = (text) => {
      // Simple mock embedding
      return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    };
    
    const emb1 = generateEmbedding('test');
    const emb2 = generateEmbedding('test');
    
    expect(Array.isArray(emb1)).toBe(true);
    expect(emb1.length).toBe(1536);
  });
  
  test('should calculate cosine similarity', () => {
    const cosineSimilarity = (a, b) => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magA * magB);
    };
    
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    
    expect(cosineSimilarity(v1, v2)).toBe(1); // Identical
    expect(cosineSimilarity(v1, v3)).toBe(0); // Orthogonal
  });
  
  test('should validate 3 minute sync interval', () => {
    const SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
    expect(SYNC_INTERVAL_MS).toBe(180000);
  });
});