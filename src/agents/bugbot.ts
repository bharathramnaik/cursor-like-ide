/**
 * BugBot - AI-Powered Code Review Agent
 * Automated code analysis and review system
 * Following Cursor's approach to automated code review
 */

export interface ReviewIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  suggestion: string;
  confidence: number;
}

export interface ReviewResult {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: ReviewIssue[];
  score: number;
  summary: string;
}

export interface ReviewScope {
  type: 'diff' | 'file' | 'directory';
  target: string;
}

export class BugBot {
  private checks: Map<string, ReviewCheck>;
  
  constructor() {
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  /**
   * Register all default code review checks
   */
  private registerDefaultChecks(): void {
    this.registerCheck({
      name: 'security',
      category: 'Security',
      check: this.checkSecurityIssues.bind(this)
    });

    this.registerCheck({
      name: 'best-practices',
      category: 'Best Practices',
      check: this.checkBestPractices.bind(this)
    });

    this.registerCheck({
      name: 'performance',
      category: 'Performance',
      check: this.checkPerformanceIssues.bind(this)
    });

    this.registerCheck({
      name: 'type-safety',
      category: 'Type Safety',
      check: this.checkTypeSafety.bind(this)
    });

    this.registerCheck({
      name: 'accessibility',
      category: 'Accessibility',
      check: this.checkAccessibility.bind(this)
    });

    console.log('[BugBot] Registered 5 default checks');
  }

  /**
   * Register a custom check
   */
  registerCheck(check: { name: string; category: string; check: (code: string) => ReviewIssue[] }): void {
    this.checks.set(check.name, check);
  }

  /**
   * Review code and return issues
   */
  async reviewCode(scope: ReviewScope): Promise<ReviewResult> {
    const allIssues: ReviewIssue[] = [];
    
    // Run all registered checks
    for (const [name, check] of this.checks) {
      try {
        const issues = await this.runCheck(name, scope);
        allIssues.push(...issues);
      } catch (error) {
        console.error(`[BugBot] Check ${name} failed:`, error);
      }
    }

    // Calculate statistics
    const errors = allIssues.filter(i => i.severity === 'error').length;
    const warnings = allIssues.filter(i => i.severity === 'warning').length;
    const infos = allIssues.filter(i => i.severity === 'info').length;

    // Calculate quality score (0-100)
    const score = this.calculateScore(errors, warnings, infos, allIssues.length);

    return {
      totalIssues: allIssues.length,
      errors,
      warnings,
      infos,
      issues: allIssues,
      score,
      summary: this.generateSummary(errors, warnings, infos, score)
    };
  }

  /**
   * Run a specific check
   */
  private async runCheck(checkName: string, scope: ReviewScope): Promise<ReviewIssue[]> {
    const check = this.checks.get(checkName);
    if (!check) return [];

    // Mock code content based on scope
    const code = this.getCodeFromScope(scope);
    return check.check(code);
  }

  /**
   * Get code from scope
   */
  private getCodeFromScope(scope: ReviewScope): string {
    // In real implementation, would read from file system
    return `function processData(input) {
  // Sample code for review
  if (input === "admin") return true;
  const value = undefined;
  return value.toString();
}`;
  }

  /**
   * Security issues check
   */
  private checkSecurityIssues(code: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const patterns = [
      { regex: /password\s*[=:]/gi, message: 'Hardcoded password detected', fix: 'Use environment variables' },
      { regex: /api[_-]?key\s*[=:]/gi, message: 'Hardcoded API key detected', fix: 'Use secure key management' },
      { regex: /secret\s*[=:]/gi, message: 'Hardcoded secret detected', fix: 'Store secrets securely' },
      { regex: /eval\s*\(/gi, message: 'Use of eval() is dangerous', fix: 'Avoid eval(), use JSON.parse() instead' },
      { regex: /innerHTML\s*=/gi, message: 'Potential XSS vulnerability', fix: 'Sanitize input before using innerHTML' },
      { regex: /sql\s*injection/gi, message: 'Potential SQL injection', fix: 'Use parameterized queries' },
      { regex: /token\s*[=:]/gi, message: 'Token exposed in code', fix: 'Use secure token storage' }
    ];

    patterns.forEach((pattern, idx) => {
      if (pattern.regex.test(code)) {
        issues.push({
          id: `security-${idx}`,
          severity: 'error',
          category: 'Security',
          message: pattern.message,
          location: { file: 'sample.js', line: 1, column: 1 },
          suggestion: pattern.fix,
          confidence: 0.95
        });
      }
    });

    return issues;
  }

  /**
   * Best practices check
   */
  private checkBestPractices(code: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Check for console.log in production code
    if (/console\.log\(/.test(code)) {
      issues.push({
        id: 'best-1',
        severity: 'warning',
        category: 'Best Practices',
        message: 'console.log() found in code',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Use proper logging library for production',
        confidence: 0.9
      });
    }

    // Check for TODO comments
    if (/\/\/\s*TODO/.test(code) || /\/\*\s*TODO/.test(code)) {
      issues.push({
        id: 'best-2',
        severity: 'info',
        category: 'Best Practices',
        message: 'TODO comment found',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Resolve TODO items before production',
        confidence: 0.85
      });
    }

    // Check for any type usage
    if (/: any\b/.test(code)) {
      issues.push({
        id: 'best-3',
        severity: 'warning',
        category: 'Best Practices',
        message: 'Using :any type reduces type safety',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Define proper types instead of using any',
        confidence: 0.8
      });
    }

    return issues;
  }

  /**
   * Performance issues check
   */
  private checkPerformanceIssues(code: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Check for nested loops that could be optimized
    if (/for\s*\([^)]*\)\s*\{[^}]*for\s*\(/gi.test(code)) {
      issues.push({
        id: 'perf-1',
        severity: 'warning',
        category: 'Performance',
        message: 'Nested loops detected - possible O(n²) complexity',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Consider using more efficient algorithms',
        confidence: 0.75
      });
    }

    // Check for inline synchronous operations
    if (/\.forEach\s*\(/.test(code)) {
      issues.push({
        id: 'perf-2',
        severity: 'info',
        category: 'Performance',
        message: 'Consider using map/filter with async',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Use async iteration for large datasets',
        confidence: 0.7
      });
    }

    return issues;
  }

  /**
   * Type safety check
   */
  private checkTypeSafety(code: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Check for null/undefined usage
    if (/==\s*null/.test(code) || /==\s*undefined/.test(code)) {
      issues.push({
        id: 'type-1',
        severity: 'warning',
        category: 'Type Safety',
        message: 'Using loose equality with null/undefined',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Use === for strict equality',
        confidence: 0.9
      });
    }

    // Check for potential undefined access
    if (/\.toString\(\)/.test(code)) {
      issues.push({
        id: 'type-2',
        severity: 'error',
        category: 'Type Safety',
        message: 'Potential undefined.toString() error',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Add null check before calling toString()',
        confidence: 0.85
      });
    }

    return issues;
  }

  /**
   * Accessibility check
   */
  private checkAccessibility(code: string): ReviewIssue[] {
    const issues: [];

    // HTML-specific checks
    if (code.includes('alt=') === false && code.includes('<img') === true) {
      issues.push({
        id: 'a11y-1',
        severity: 'warning',
        category: 'Accessibility',
        message: 'Image missing alt attribute',
        location: { file: 'sample.js', line: 1, column: 1 },
        suggestion: 'Add descriptive alt text',
        confidence: 0.9
      });
    }

    return issues;
  }

  /**
   * Calculate quality score
   */
  private calculateScore(errors: number, warnings: number, infos: number, total: number): number {
    if (total === 0) return 100;

    // Deduct points based on issue severity
    let score = 100;
    score -= errors * 10;
    score -= warnings * 3;
    score -= infos * 1;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate summary text
   */
  private generateSummary(errors: number, warnings: number, infos: number, score: number): string {
    let summary = '';

    if (score >= 90) {
      summary = 'Excellent code quality!';
    } else if (score >= 70) {
      summary = 'Good code quality with minor issues.';
    } else if (score >= 50) {
      summary = 'Code needs some improvements.';
    } else {
      summary = 'Code requires significant improvements.';
    }

    return `${summary} Found ${errors} errors, ${warnings} warnings, ${infos} infos. Score: ${score}/100`;
  }

  /**
   * Get list of available checks
   */
  getAvailableChecks(): string[] {
    return Array.from(this.checks.keys());
  }
}

export default BugBot;