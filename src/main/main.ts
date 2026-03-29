/**
 * Cursor-Like IDE - Electron Main Process
 * 
 * This is the main entry point for the Electron application.
 * Following Cursor's architecture: Electron + TypeScript + VS Code fork concepts.
 */

import { app, BrowserWindow, ipcMain, Menu, shell, dialog, globalShortcut } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

// Global references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
 * Similar to how Cursor wraps VS Code functionality
 */
function createWindow(): void {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'CursorLike IDE',
    backgroundColor: '#1e1e1e',  // VS Code dark theme background
    show: false,  // Show after ready-to-show
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // Required for some VS Code features
      webviewTag: true
    }
  });

  // Build application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:newFile') },
        { label: 'Open File', accelerator: 'CmdOrCtrl+O', click: () => handleOpenFile() },
        { label: 'Open Folder', accelerator: 'CmdOrCtrl+Shift+O', click: () => handleOpenFolder() },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:saveAs') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'AI',
      submenu: [
        { label: 'Ctrl+K - Command Palette', accelerator: 'CmdOrCtrl+K', click: () => mainWindow?.webContents.send('ai:commandPalette') },
        { label: 'Ctrl+L - Inline Chat', accelerator: 'CmdOrCtrl+L', click: () => mainWindow?.webContents.send('ai:inlineChat') },
        { label: 'Ctrl+I - AI Chat', accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('ai:chat') },
        { type: 'separator' },
        { label: 'Run Agent', click: () => mainWindow?.webContents.send('ai:runAgent') },
        { label: 'Stop Agent', click: () => mainWindow?.webContents.send('ai:stopAgent') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => shell.openExternal('https://cursor.sh') },
        { label: 'Report Issue', click: () => shell.openExternal('https://github.com/bharathramnaik/cursor-like-ide/issues') },
        { type: 'separator' },
        { label: 'About', click: () => showAboutDialog() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window displayed');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Handle opening a file
 */
async function handleOpenFile(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'Rust', extensions: ['rs'] },
      { name: 'Go', extensions: ['go'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow?.webContents.send('file:open', result.filePaths[0]);
  }
}

/**
 * Handle opening a folder
 */
async function handleOpenFolder(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow?.webContents.send('folder:open', result.filePaths[0]);
  }
}

/**
 * Show about dialog
 */
function showAboutDialog(): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'About CursorLike IDE',
    message: 'CursorLike IDE',
    detail: 'Version 1.0.0\n\nA Cursor-like AI-powered IDE with agentic workflow.\n\nBuilt with Electron + TypeScript\nFollowing Cursor architecture patterns.'
  });
}

// Register global shortcuts
function registerGlobalShortcuts(): void {
  // Ctrl+Shift+P - Command palette (like Cursor)
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    mainWindow?.webContents.send('ai:commandPalette');
  });
}

// IPC Handlers - Communication between main and renderer
function setupIPCHandlers(): void {
  // File operations
  ipcMain.handle('dialog:openFile', handleOpenFile);
  ipcMain.handle('dialog:openFolder', handleOpenFolder);
  
  // App info
  ipcMain.handle('app:getPath', (_, name: string) => {
    return app.getPath(name as any);
  });
  
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

// App event handlers
app.whenReady().then(() => {
  log.info('App is ready');
  setupIPCHandlers();
  createWindow();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

export { mainWindow };