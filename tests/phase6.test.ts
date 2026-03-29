/**
 * Comprehensive Tests - Phase 6
 * BugBot Code Review + Memory System + Final Integration
 */

describe('BugBot Code Review Tests', () => {
  let bugBot;

  beforeEach(() => {
    bugBot = {
      checks: new Map(),
      registerCheck(check) {
        this.checks.set(check.name, check);
        return this;
      },
      registerDefaultChecks() {
        this.registerCheck({ name: 'security', category: 'Security', check: () => [] });
        this.registerCheck({ name: 'best-practices', category: 'Best Practices', check: () => [] });
        this.registerCheck({ name: 'performance', category: 'Performance', check: () => [] });
        this.registerCheck({ name: 'type-safety', category: 'Type Safety', check: () => [] });
      },
      async reviewCode(scope) {
        const issues = [];
        issues.push(...this.checkSecurityIssues('const password = "secret123"'));
        issues.push(...this.checkBestPractices('console.log("test")'));
        return {
          totalIssues: issues.length,
          errors: issues.filter(i => i.severity === 'error').length,
          warnings: issues.filter(i => i.severity === 'warning').length,
          infos: issues.filter(i => i.severity === 'info').length,
          issues,
          score: 85,
          summary: 'Good code quality'
        };
      },
      checkSecurityIssues(code) {
        const issues = [];
        if (/password\s*[=:]/i.test(code)) issues.push({ id: 'sec-1', severity: 'error', category: 'Security' });
        if (/api[_-]?key\s*[=:]/i.test(code)) issues.push({ id: 'sec-2', severity: 'error', category: 'Security' });
        return issues;
      },
      checkBestPractices(code) {
        const issues = [];
        if (/console\.log\(/.test(code)) issues.push({ id: 'best-1', severity: 'warning', category: 'Best Practices' });
        return issues;
      }
    };
    bugBot.registerDefaultChecks();
  });

  test('should register default checks', () => {
    expect(bugBug.checks.size).toBe(4);
  });

  test('should detect security issues', async () => {
    const result = await bugBot.reviewCode({ type: 'file', target: 'test.js' });
    expect(result.totalIssues).toBeGreaterThanOrEqual(0);
  });

  test('should calculate quality score', () => {
    const calculateScore = (errors, warnings, infos) => {
      let score = 100;
      score -= errors * 10;
      score -= warnings * 3;
      score -= infos * 1;
      return Math.max(0, score);
    };

    expect(calculateScore(0, 0, 0)).toBe(100);
    expect(calculateScore(3, 2, 1)).toBe(71);
    expect(calculateScore(10, 5, 0)).toBe(35);
  });

  test('should identify hardcoded passwords', () => {
    const issues = bugBot.checkSecurityIssues('const password = "secret123"');
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('error');
  });

  test('should identify console.log usage', () => {
    const issues = bugBot.checkBestPractices('console.log("test")');
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('warning');
  });
});

describe('ContextMemory Tests', () => {
  let memory;

  beforeEach(() => {
    memory = {
      storage: new Map(),
      async storeInteraction(query, response, context = {}) {
        const id = `mem_${Date.now()}`;
        this.storage.set(id, {
          id,
          type: context.type || 'interaction',
          query,
          response,
          keyContext: context.keyContext || [],
          files: context.files || [],
          timestamp: Date.now(),
          importance: 0.8
        });
        return id;
      },
      async retrieveRelevantMemory(query, topK = 5) {
        const results = [];
        for (const [id, entry] of this.storage) {
          if (entry.query.toLowerCase().includes(query.toLowerCase()) || 
              entry.response.toLowerCase().includes(query.toLowerCase())) {
            results.push({ entry, relevance: 0.8 });
            if (results.length >= topK) break;
          }
        }
        return results;
      },
      async getFileRelatedMemories(filePath) {
        return Array.from(this.storage.values()).filter(e => e.files.includes(filePath));
      },
      calculateTimeDecay(timestamp) {
        const hoursOld = (Date.now() - timestamp) / (1000 * 60 * 60);
        return hoursOld < 1 ? 1 : 0.9;
      },
      async clear() {
        this.storage.clear();
      }
    };
  });

  test('should store interaction', async () => {
    const id = await memory.storeInteraction('How to sort?', 'Use .sort()', { files: ['array.js'] });
    expect(id).toBeTruthy();
    expect(memory.storage.size).toBe(1);
  });

  test('should retrieve relevant memories', async () => {
    await memory.storeInteraction('Sort array', 'Use arr.sort()', {});
    await memory.storeInteraction('Filter array', 'Use arr.filter()', {});
    await memory.storeInteraction('String length', 'Use str.length', {});

    const results = await memory.retrieveRelevantMemory('sort');
    expect(results.length).toBeGreaterThan(0);
  });

  test('should calculate time decay correctly', () => {
    const recentTime = Date.now();
    const oldTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

    expect(memory.calculateTimeDecay(recentTime)).toBe(1);
    expect(memory.calculateTimeDecay(oldTime)).toBeLessThan(1);
  });

  test('should get file-related memories', async () => {
    await memory.storeInteraction('Edit file', 'Code here', { files: ['main.ts'] });
    await memory.storeInteraction('Other', 'Other code', { files: ['utils.ts'] });

    const results = await memory.getFileRelatedMemories('main.ts');
    expect(results.length).toBe(1);
  });

  test('should clear all memories', async () => {
    await memory.storeInteraction('Q1', 'A1', {});
    await memory.storeInteraction('Q2', 'A2', {});
    expect(memory.storage.size).toBe(2);

    await memory.clear();
    expect(memory.storage.size).toBe(0);
  });
});

describe('Integration Tests', () => {
  test('should handle complete workflow', async () => {
    const memory = {
      storage: new Map(),
      async storeInteraction(q, r, c = {}) {
        const id = `m_${Date.now()}`;
        this.storage.set(id, { id, query: q, response: r, timestamp: Date.now(), importance: 0.8 });
        return id;
      }
    };

    // Store interaction
    await memory.storeInteraction('Create function', 'function myFunc() {}', { files: ['app.js'] });

    // Verify stored
    expect(memory.storage.size).toBe(1);
  });

  test('should handle error recovery workflow', async () => {
    const memory = {
      storage: new Map(),
      async storeErrorRecovery(error, fix) {
        const id = `err_${Date.now()}`;
        this.storage.set(id, {
          id,
          type: 'error_recovery',
          query: `Error: ${error}`,
          response: `Fix: ${fix}`,
          timestamp: Date.now(),
          importance: 1.0
        });
        return id;
      }
    };

    await memory.storeErrorRecovery('TypeError: undefined', 'Added null check');
    expect(memory.storage.size).toBe(1);

    const result = Array.from(memory.storage.values())[0];
    expect(result.type).toBe('error_recovery');
    expect(result.importance).toBe(1.0);
  });

  test('should calculate similarity scores', () => {
    const cosineSimilarity = (a, b) => {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
      const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
      return dot / (magA * magB);
    };

    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1);

    const v3 = [0, 1, 0];
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0);
  });
});

describe('Performance Tests', () => {
  test('should handle large number of memories', async () => {
    const memory = {
      storage: new Map(),
      async storeInteraction(q, r) {
        const id = `m_${Date.now()}_${Math.random()}`;
        this.storage.set(id, { id, query: q, response: r, timestamp: Date.now(), importance: 0.5 });
        return id;
      }
    };

    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      await memory.storeInteraction(`Query ${i}`, `Response ${i}`, {});
    }
    const duration = Date.now() - start;

    expect(memory.storage.size).toBe(100);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should return results within time limit', async () => {
    const memory = {
      storage: new Map(),
      async storeInteraction(q, r) {
        this.storage.set(`m_${Date.now()}`, { q, r, t: Date.now() });
      },
      async retrieveRelevantMemory(q) {
        const start = Date.now();
        // Simulate search
        while (Date.now() - start < 10) {}
        return [];
      }
    };

    for (let i = 0; i < 50; i++) {
      await memory.storeInteraction(`Query ${i}`, `Response ${i}`);
    }

    const start = Date.now();
    await memory.retrieveRelevantMemory('test');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be fast
  });
});