/**
 * Multi-Agent Orchestrator
 * Manages parallel agent execution using Git worktrees
 */

import { execSync } from 'child_process';
import path from 'path';
import { mkdir, writeFile, remove } from 'fs/promises';
import { existsSync } from 'fs';

export class AgentOrchestrator {
  constructor(options = {}) {
    this.maxParallel = options.maxParallel || 8;
    this.worktrees = new Map();
    this.basePath = options.basePath || process.cwd();
    this.worktreeBase = path.join(this.basePath, '.cursor-worktrees');
  }

  async createWorktree(branchName) {
    const worktreePath = path.join(this.worktreeBase, branchName);
    
    if (!existsSync(this.worktreeBase)) {
      execSync(`mkdir -p ${this.worktreeBase}`);
    }

    try {
      execSync(`git worktree add ${worktreePath} -b ${branchName}`, {
        cwd: this.basePath,
        stdio: 'ignore'
      });
    } catch (error) {
      // Worktree might already exist
      console.log(`Worktree ${branchName} may already exist`);
    }

    this.worktrees.set(branchName, {
      path: worktreePath,
      branch: branchName,
      active: true
    });

    return worktreePath;
  }

  async removeWorktree(branchName) {
    const worktree = this.worktrees.get(branchName);
    if (!worktree) return;

    try {
      execSync(`git worktree remove ${worktree.path} --force`, {
        cwd: this.basePath,
        stdio: 'ignore'
      });
      
      // Also remove branch
      execSync(`git branch -D ${branchName}`, {
        cwd: this.basePath,
        stdio: 'ignore'
      });
    } catch (error) {
      console.error('Failed to remove worktree:', error);
    }

    this.worktrees.delete(branchName);
  }

  async executeInWorktree(agent, task, branchName) {
    const worktree = this.worktrees.get(branchName);
    if (!worktree) {
      throw new Error(`Worktree ${branchName} not found`);
    }

    // Execute agent task in isolated worktree
    const result = await agent.execute(task, {
      workdir: worktree.path,
      isolated: true
    });

    return result;
  }

  async mergeChanges(branchName, commitMessage) {
    const worktree = this.worktrees.get(branchName);
    if (!worktree) {
      throw new Error(`Worktree ${branchName} not found`);
    }

    // Get diff before merging
    const diff = execSync(`git diff main...${branchName}`, {
      cwd: this.basePath,
      encoding: 'utf8'
    });

    // In production: Present diff to user for review
    // For demo: auto-commit
    execSync(`git add -A`, { cwd: worktree.path });
    execSync(`git commit -m "${commitMessage}"`, { cwd: worktree.path });
    execSync(`git checkout main`, { cwd: this.basePath });
    execSync(`git merge ${branchName}`, { cwd: this.basePath });

    // Cleanup worktree
    await this.removeWorktree(branchName);

    return diff;
  }
}

/**
 * Model Router
 * Intelligently routes tasks to appropriate models
 */
export class ModelRouter {
  constructor(llmClients) {
    this.clients = llmClients;
    this.defaultModel = 'composer';
  }

  async assessComplexity(task) {
    // Simple heuristic for demo
    const taskLower = task.toLowerCase();
    
    // Simple tasks: single file, boilerplate
    const simpleIndicators = [
      'create file', 'write function', 'simple refactor',
      'add import', 'export', 'type alias'
    ];
    
    // Complex tasks: multi-file, architecture
    const complexIndicators = [
      'refactor entire', 'migrate', 'architect',
      'create api', 'database', 'auth system'
    ];

    if (complexIndicators.some(i => taskLower.includes(i))) {
      return 'complex';
    }
    
    if (simpleIndicators.some(i => taskLower.includes(i))) {
      return 'simple';
    }

    return 'moderate';
  }

  async route(task) {
    const complexity = await this.assessComplexity(task);

    switch (complexity) {
      case 'simple':
        return {
          provider: 'composer', // Custom fast model
          model: 'composer-fast'
        };
      case 'moderate':
        return {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514'
        };
      case 'complex':
        return {
          provider: 'openai',
          model: 'gpt-4-turbo-preview'
        };
      default:
        return {
          provider: 'composer',
          model: 'composer-default'
        };
    }
  }
}

/**
 * Anyrun Orchestrator (Cloud Service Simulation)
 * In production: Rust-based service using AWS Firecracker
 */
export class AnyrunOrchestrator {
  constructor() {
    this.activeVMs = new Map();
    this.maxVMs = 10;
  }

  async launchAgent(taskConfig) {
    // Simulate VM allocation
    if (this.activeVMs.size >= this.maxVMs) {
      throw new Error('No VMs available - please wait');
    }

    const vmId = `vm-${Date.now()}`;
    const vm = {
      id: vmId,
      config: taskConfig,
      status: 'starting',
      startTime: Date.now()
    };

    this.activeVMs.set(vmId, vm);

    // Simulate startup
    await new Promise(resolve => setTimeout(resolve, 500));
    vm.status = 'running';

    return vm;
  }

  async terminateAgent(vmId) {
    this.activeVMs.delete(vmId);
  }

  async getStatus() {
    return {
      activeVMs: this.activeVMs.size,
      maxVMs: this.maxVMs,
      utilization: this.activeVMs.size / this.maxVMs
    };
  }
}