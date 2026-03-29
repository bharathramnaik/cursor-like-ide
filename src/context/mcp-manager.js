import { watch } from 'chokidar';
import { readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

export class MCPManager {
  constructor() {
    this.db = null;
    this.fileWatchers = new Map();
    this.contextCache = new Map();
    this.isInitialized = false;
  }
  
  async initialize() {
    try {
      // Initialize local database for context storage
      const adapter = new JSONFile('./context/db.json');
      this.db = await low(adapter);
      
      // Set default data structure if empty
      this.db.defaults({ 
        files: {}, 
        embeddings: {}, 
        lastSync: {} 
      }).write();
      
      // Start watching for file changes in the current directory
      await this.startFileWatching(process.cwd());
      
      this.isInitialized = true;
      console.log('🗄️ MCP Manager initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP Manager:', error);
      throw error;
    }
  }
  
  async startFileWatching(directoryPath) {
    try {
      const watcher = watch(directoryPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true
      });
      
      watcher
        .on('add', filePath => this.onFileChange(filePath, 'add'))
        .on('change', filePath => this.onFileChange(filePath, 'change'))
        .on('unlink', filePath => this.onFileChange(filePath, 'delete'));
      
      this.fileWatchers.set(directoryPath, watcher);
      console.log(`👀 Started watching directory: ${directoryPath}`);
    } catch (error) {
      console.error(`❌ Failed to start file watching: ${error.message}`);
    }
  }
  
  async onFileChange(filePath, changeType) {
    try {
      const fullPath = path.resolve(filePath);
      const stats = await stat(fullPath);
      
      // Update file info in database
      const fileInfo = {
        path: fullPath,
        size: stats.size,
        modified: stats.mtime,
        changeType,
        timestamp: Date.now()
      };
      
      this.db.set(`files.${fullPath}`, fileInfo).write();
      
      // Update context cache
      this.contextCache.set(fullPath, {
        ...fileInfo,
        content: null // Will be loaded on demand
      });
      
      console.log(`📝 File ${changeType}: ${path.basename(fullPath)}`);
    } catch (error) {
      console.error(`❌ Error processing file change: ${error.message}`);
    }
  }
  
  async getFileContent(filePath) {
    const resolvedPath = path.resolve(filePath);
    
    // Check cache first
    if (this.contextCache.has(resolvedPath)) {
      const cached = this.contextCache.get(resolvedPath);
      if (cached.content !== null) {
        return cached.content;
      }
    }
    
    // Read from file system
    try {
      const content = await readFile(resolvedPath, 'utf8');
      
      // Update cache
      this.contextCache.set(resolvedPath, {
        ...(this.contextCache.get(resolvedPath) || {}),
        content
      });
      
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }
  
  async getFileInfo(filePath) {
    const resolvedPath = path.resolve(filePath);
    const fileData = this.db.get(`files.${resolvedPath}`).value();
    
    if (!fileData) {
      // Try to get fresh stats
      try {
        const stats = await stat(resolvedPath);
        return {
          path: resolvedPath,
          size: stats.size,
          modified: stats.mtime,
          changeType: 'unknown',
          timestamp: Date.now()
        };
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }
    }
    
    return fileData;
  }
  
  async searchFiles(query, options = {}) {
    const { path: searchPath = '.', filePattern } = options;
    const fullSearchPath = path.resolve(searchPath);
    
    // Get all files from database
    const allFiles = this.db.get('files').value() || {};
    
    // Filter by path and pattern
    const matchingFiles = Object.values(allFiles)
      .filter(fileInfo => {
        const filePath = fileInfo.path;
        
        // Check if file is within search path
        const relativePath = path.relative(fullSearchPath, filePath);
        if (relativePath.startsWith('..')) {
          return false; // Outside search path
        }
        
        // Check file pattern if provided
        if (filePattern) {
          const fileName = path.basename(filePath);
          const minimatch = require('minimatch');
          return minimatch(fileName, filePattern);
        }
        
        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    // If we have a text query, do simple matching
    if (query && query.trim() !== '') {
      const searchTerms = query.toLowerCase().split(/\s+/);
      
      return await Promise.all(
        matchingFiles
          .filter(async fileInfo => {
            try {
              const content = await this.getFileContent(fileInfo.path);
              const lowerContent = content.toLowerCase();
              
              // Check if all search terms appear in the content
              return searchTerms.every(term => 
                lowerContent.includes(term.toLowerCase())
              );
            } catch (error) {
              return false; // Skip files we can't read
            }
          })
          .map(fileInfo => ({
            ...fileInfo,
            relevance: this.calculateRelevance(await this.getFileContent(fileInfo.path), query)
          }))
          .sort((a, b) => b.relevance - a.relevance)
      );
    }
    
    return matchingFiles;
  }
  
  calculateRelevance(content, query) {
    const terms = query.toLowerCase().split(/\s+/);
    const lowerContent = content.toLowerCase();
    
    let score = 0;
    for (const term of terms) {
      if (term.length > 2) {
        const matches = (lowerContent.match(new RegExp(term, 'g')) || []).length;
        score += matches;
      }
    }
    
    return score;
  }
  
  async getContextSummary() {
    const files = this.db.get('files').value() || {};
    const fileCount = Object.keys(files).length;
    
    let totalSize = 0;
    let recentChanges = 0;
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const fileInfo of Object.values(files)) {
      totalSize += fileInfo.size || 0;
      if (fileInfo.timestamp > oneHourAgo) {
        recentChanges++;
      }
    }
    
    return {
      totalFiles: fileCount,
      totalSize: this.formatBytes(totalSize),
      recentChanges: recentChanges,
      lastUpdated: new Date(Math.max(...Object.values(files).map(f => f.timestamp || 0))).toISOString()
    };
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  async shutdown() {
    // Close all file watchers
    for (const [path, watcher] of this.fileWatchers.entries()) {
      watcher.close();
      console.log(`👁️ Stopped watching: ${path}`);
    }
    this.fileWatchers.clear();
    
    // Clear context cache
    this.contextCache.clear();
    
    console.log('🗄️ MCP Manager shut down');
  }
}