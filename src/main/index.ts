// ============================================================================
// Anything Download Manager — Main Process Entry Point
// ============================================================================

import { app, BrowserWindow } from 'electron';
import { DownloadManager } from './download/download-manager';
import { TorrentManager } from './torrent/torrent-manager';
import { AppDatabase } from './database/database';
import { WindowManager } from './window-manager';
import { NativeMessagingHost } from './native-messaging';
import { registerIPCHandlers } from './ipc-handlers';
import { createTray } from './tray';
import { IPC } from '../shared/ipc-channels';
import type { BrowserDownloadMessage } from '../shared/types';

// Ensure single application instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let downloadManager: DownloadManager;
  let torrentManager: TorrentManager;
  let database: AppDatabase;
  let windowManager: WindowManager;
  let nativeMessagingHost: NativeMessagingHost;

  app.on('second-instance', (_event, commandLine) => {
    // Focus existing window
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    // Check for magnet or URL passed via command line
    const lastArg = commandLine[commandLine.length - 1];
    if (lastArg && lastArg.startsWith('magnet:')) {
      torrentManager.addMagnet(lastArg);
    } else if (lastArg && (lastArg.startsWith('http://') || lastArg.startsWith('https://'))) {
      downloadManager.addDownload({ url: lastArg });
    }
  });

  app.whenReady().then(async () => {
    // 1. Initialize Database
    database = AppDatabase.getInstance();

    // 2. Initialize Download & Torrent Managers
    downloadManager = DownloadManager.getInstance();
    torrentManager = TorrentManager.getInstance();

    // Restore previous downloads from database
    const savedDownloads = database.getAllDownloads();
    for (const task of savedDownloads) {
      downloadManager.restoreTask(task);
    }

    // 3. Initialize Window Manager & Create Main Window
    windowManager = WindowManager.getInstance();
    const mainWindow = windowManager.createMainWindow();

    // 4. Setup System Tray
    createTray(mainWindow);

    // 5. Register IPC Handlers
    registerIPCHandlers(downloadManager, torrentManager, database, windowManager);

    // 6. Setup Browser Extension Integration Gateway
    nativeMessagingHost = new NativeMessagingHost();

    nativeMessagingHost.on('download-intercepted', (msg: BrowserDownloadMessage) => {
      // Create and open IDM-style download popup
      const popup = windowManager.createPopupWindow();
      popup.webContents.once('did-finish-load', () => {
        popup.webContents.send(IPC.BROWSER_DOWNLOAD_INTERCEPTED, {
          url: msg.url,
          fileName: msg.fileName,
          headers: msg.headers,
          referrer: msg.referrer,
        });
      });

      // Also notify main window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC.BROWSER_DOWNLOAD_INTERCEPTED, {
          url: msg.url,
          fileName: msg.fileName,
          headers: msg.headers,
          referrer: msg.referrer,
        });
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });
  });

  // Handle cleanup on quit
  app.on('before-quit', () => {
    if (nativeMessagingHost) {
      nativeMessagingHost.stop();
    }
    if (torrentManager) {
      torrentManager.destroy();
    }
    if (database) {
      database.close();
    }
  });

  app.on('window-all-closed', () => {
    // On macOS, keep running in background/tray unless explicitly quit
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
