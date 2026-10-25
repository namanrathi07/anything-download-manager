// ============================================================================
// Anything Download Manager — Window Manager
// ============================================================================

import { BrowserWindow, app } from 'electron';
import path from 'path';

export class WindowManager {
  private static instance: WindowManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private popupWindow: BrowserWindow | null = null;

  private isDev = !app.isPackaged;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public getPopupWindow(): BrowserWindow | null {
    return this.popupWindow;
  }

  public createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/index.js');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: 'Anything Download Manager',
      backgroundColor: '#020617',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    if (this.isDev && process.env.VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      const htmlPath = path.join(__dirname, '../renderer/index.html');
      this.mainWindow.loadFile(htmlPath);
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  public createPopupWindow(): BrowserWindow {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.focus();
      return this.popupWindow;
    }

    const preloadPath = path.join(__dirname, '../preload/index.js');

    this.popupWindow = new BrowserWindow({
      width: 520,
      height: 380,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      title: 'ADM — Download File',
      backgroundColor: '#0f172a',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    if (this.isDev && process.env.VITE_DEV_SERVER_URL) {
      this.popupWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/popup.html`);
    } else {
      const htmlPath = path.join(__dirname, '../renderer/popup.html');
      this.popupWindow.loadFile(htmlPath);
    }

    this.popupWindow.on('closed', () => {
      this.popupWindow = null;
    });

    return this.popupWindow;
  }

  public closePopupWindow(): void {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.close();
      this.popupWindow = null;
    }
  }
}
