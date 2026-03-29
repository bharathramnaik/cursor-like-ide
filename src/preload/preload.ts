/**
 * Preload Script - Secure bridge between main and renderer
 * Following Cursor's model of exposing safe APIs to the renderer
 */

import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for exposed API
export interface ElectronAPI {
  // File dialogs
  openFile: () => Promise<void>;
  openFolder: () => Promise<void>;
  
  // App paths
  getPath: (name: string) => Promise<string>;
  
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  
  // Event listeners
  onMenuNewFile: (callback: () => void) => void;
  onMenuSave: (callback: () => void) => void;
  onFileOpen: (callback: (path: string) => void) => void;
  onFolderOpen: (callback: (path: string) => void) => void;
  onAICommandPalette: (callback: () => void) => void;
  onAIInlineChat: (callback: () => void) => void;
  onAIChat: (callback: () => void) => void;
  onAIRunAgent: (callback: () => void) => void;
  onAIStopAgent: (callback: () => void) => void;
}

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  
  // App paths
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  
  // Event listeners - Menu actions
  onMenuNewFile: (callback: () => void) => ipcRenderer.on('menu:newFile', callback),
  onMenuSave: (callback: () => void) => ipcRenderer.on('menu:save', callback),
  
  // File operations
  onFileOpen: (callback: (path: string) => void) => ipcRenderer.on('file:open', (_, path) => callback(path)),
  onFolderOpen: (callback: (path: string) => void) => ipcRenderer.on('folder:open', (_, path) => callback(path)),
  
  // AI features
  onAICommandPalette: (callback: () => void) => ipcRenderer.on('ai:commandPalette', callback),
  onAIInlineChat: (callback: () => void) => ipcRenderer.on('ai:inlineChat', callback),
  onAIChat: (callback: () => void) => ipcRenderer.on('ai:chat', callback),
  onAIRunAgent: (callback: () => void) => ipcRenderer.on('ai:runAgent', callback),
  onAIStopAgent: (callback: () => void) => ipcRenderer.on('ai:stopAgent', callback)
} as ElectronAPI);

// Notify TypeScript about window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}