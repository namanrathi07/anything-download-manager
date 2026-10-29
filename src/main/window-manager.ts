// ============================================================================
// Anything Download Manager — Window Manager (Tray-Close & Lifecycle Safe)
// ============================================================================

import { BrowserWindow, app } from 'electron';
import path from 'path';

export class WindowManager {
  private static instance: WindowManager | null = null;
  private mainWindow: BrowserWindow | null = null;
  private popupWindow: BrowserWindow | null = null;
  private isDev = !app.isPackaged;
  private isQuitting = false;
  private minimizeToTray = true;

  private constructor() {}

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public setQuitting(quitting: boolean): void {
    this.isQuitting = quitting;
  }

  public isAppQuitting(): boolean {
    return this.isQuitting;
  }

  public setMinimizeToTray(enabled: boolean): void {
    this.minimizeToTray = enabled;
  }

  public getMinimizeToTray(): boolean {
    return this.minimizeToTray;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow && !this.mainWindow.isDestroyed() ? this.mainWindow : null;
  }

  public getPopupWindow(): BrowserWindow | null {
    return this.popupWindow && !this.popupWindow.isDestroyed() ? this.popupWindow : null;
  }

  public showMainWindow(): BrowserWindow {
    const existing = this.getMainWindow();
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      if (!existing.isVisible()) existing.show();
      existing.focus();
      if (process.platform === 'darwin') {
        app.dock?.show();
      }
      return existing;
    }
    return this.createMainWindow(false);
  }

  public createMainWindow(startHidden = false): BrowserWindow {
    const existing = this.getMainWindow();
    if (existing) {
      if (!startHidden) {
        if (existing.isMinimized()) existing.restore();
        if (!existing.isVisible()) existing.show();
        existing.focus();
      }
      return existing;
    }

    const preloadPath = path.join(__dirname, '../preload/index.js');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: 'Anything Download Manager',
      backgroundColor: '#020617',
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.mainWindow.once('ready-to-show', () => {
      if (!startHidden) {
        this.mainWindow?.show();
      }
    });

    // Intercept window close button (X) so ADM minimizes to system tray instead of exiting
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && this.minimizeToTray) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
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
    const existing = this.getPopupWindow();
    if (existing) {
      if (!existing.isVisible()) existing.show();
      existing.focus();
      return existing;
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
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.popupWindow.once('ready-to-show', () => {
      this.popupWindow?.show();
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
