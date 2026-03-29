/**
 * Merkle Tree Sync - Differential Code Synchronization
 * Implements Cursor's 3-minute sync interval for keeping code index up-to-date
 * 
 * Following Cursor's approach: use Merkle trees to avoid storing source code
 * on the server while enabling fast semantic search
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export interface FileNode {
  path: string;
  hash: string;
  size: number;
  modified: number;
}

export interface MerkleTreeNode {
  path: string;
  type: 'file' | 'directory';
  hash: string;
  children?: MerkleTreeNode[];
}

export class MerkleTreeSync {
  private rootPath: string;
  private localTree: MerkleTreeNode | null = null;
  private serverTree: MerkleTreeNode | null = null;
  private syncInterval: number = 3 * 60 * 1000; // 3 minutes
  private fileIgnorePatterns: RegExp[];

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.fileIgnorePatterns = [
      /node_modules/,
      /\.git/,
      /dist$/,
      /build$/,
      /coverage/,
      /\.DS_Store/,
      /Thumbs\.db/,
      /__pycache__/
    ];
  }

  /**
   * Build Merkle tree from file system
   */
  async buildLocalTree(dirPath: string = this.rootPath): Promise<MerkleTreeNode> {
    const stats = await fs.stat(dirPath);
    
    if (stats.isFile()) {
      const content = await fs.readFile(dirPath);
      return {
        path: dirPath,
        type: 'file',
        hash: this.hashContent(content.toString('utf-8'))
      };
    }

    if (stats.isDirectory()) {
      const entries = await fs.readdir(dirPath);
      const children: MerkleTreeNode[] = [];
      
      for (const entry of entries) {
        // Skip ignored patterns
        if (this.shouldIgnore(entry)) continue;
        
        const fullPath = path.join(dirPath, entry);
        try {
          const child = await this.buildLocalTree(fullPath);
          children.push(child);
        } catch (e) {
          // Skip inaccessible files
        }
      }
      
      // Sort children for deterministic hash
      children.sort((a, b) => a.path.localeCompare(b.path));
      
      return {
        path: dirPath,
        type: 'directory',
        hash: this.hashChildren(children),
        children
      };
    }

    throw new Error(`Unknown file type: ${dirPath}`);
  }

  /**
   * Hash file content
   */
  hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Hash children to create node hash
   */
  hashChildren(children: MerkleTreeNode[]): string {
    const combined = children.map(c => c.hash).join('|');
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Check if file/directory should be ignored
   */
  private shouldIgnore(name: string): boolean {
    return this.fileIgnorePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Find differences between local and server trees
   */
  findDifferences(localNode: MerkleTreeNode, serverNode: MerkleTreeNode): string[] {
    const changes: string[] = [];
    
    if (!serverNode) {
      changes.push(`ADD: ${localNode.path}`);
      return changes;
    }

    if (localNode.hash !== serverNode.hash) {
      if (localNode.type === 'file') {
        changes.push(`MODIFY: ${localNode.path}`);
      } else if (localNode.type === 'directory') {
        // Recurse into directories
        const localChildren = (localNode.children || []).reduce(
          (acc, c) => { acc[c.path] = c; return acc; }, 
          {} as Record<string, MerkleTreeNode>
        );
        const serverChildren = (serverNode.children || []).reduce(
          (acc, c) => { acc[c.path] = c; return acc; }, 
          {} as Record<string, MerkleTreeNode>
        );
        
        for (const childPath of Object.keys(localChildren)) {
          if (!serverChildren[childPath]) {
            changes.push(`ADD: ${childPath}`);
          } else {
            changes.push(...this.findDifferences(localChildren[childPath], serverChildren[childPath]));
          }
        }
      }
    }

    return changes;
  }

  /**
   * Compare root hashes to check if sync needed
   */
  needsSync(): boolean {
    if (!this.localTree || !this.serverTree) return true;
    return this.localTree.hash !== this.serverTree.hash;
  }

  /**
   * Get changed files for re-indexing
   */
  async getChangedFiles(): Promise<string[]> {
    this.localTree = await this.buildLocalTree();
    
    // If no server tree, return all files
    if (!this.serverTree) {
      const allFiles: string[] = [];
      const collectFiles = (node: MerkleTreeNode) => {
        if (node.type === 'file') {
          allFiles.push(node.path);
        } else if (node.children) {
          node.children.forEach(collectFiles);
        }
      };
      collectFiles(this.localTree);
      return allFiles;
    }

    // Find differences
    const diffs = this.findDifferences(this.localTree, this.serverTree);
    return diffs.map(d => d.split(': ')[1]).filter(Boolean);
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(onSync: () => void): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        this.localTree = await this.buildLocalTree();
        
        if (this.needsSync()) {
          const changedFiles = await this.getChangedFiles();
          console.log(`[MerkleTree] ${changedFiles.length} files changed, syncing...`);
          await onSync();
          this.serverTree = this.localTree;
        }
      } catch (error) {
        console.error('[MerkleTree] Sync error:', error);
      }
    }, this.syncInterval);
  }

  /**
   * Update server tree after sync
   */
  updateServerTree(serverTree: MerkleTreeNode): void {
    this.serverTree = serverTree;
  }

  /**
   * Get root hash for comparison
   */
  getLocalRootHash(): string {
    return this.localTree?.hash || '';
  }
}

export default MerkleTreeSync;