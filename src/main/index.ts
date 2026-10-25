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
    const mainWindow = windowManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    const lastArg = commandLine[commandLine.length - 1];
    if (lastArg && lastArg.startsWith('magnet:')) {
      torrentManager?.addMagnet(lastArg);
    } else if (lastArg && (lastArg.startsWith('http://') || lastArg.startsWith('https://'))) {
      downloadManager?.addDownload({ url: lastArg });
    }
  });

  app.whenReady().then(async () => {
    database = AppDatabase.getInstance();
    downloadManager = DownloadManager.getInstance();
    torrentManager = TorrentManager.getInstance();

    const savedDownloads = database.getAllDownloads();
    for (const task of savedDownloads) {
      downloadManager.restoreTask(task);
    }

    windowManager = WindowManager.getInstance();
    const mainWindow = windowManager.createMainWindow();

    createTray(mainWindow);
    registerIPCHandlers(downloadManager, torrentManager, database, windowManager);

    nativeMessagingHost = new NativeMessagingHost();

    nativeMessagingHost.on('download-intercepted', (msg: BrowserDownloadMessage) => {
      const payload = {
        url: msg.url,
        fileName: msg.fileName,
        headers: msg.headers,
        referrer: msg.referrer,
      };

      const popup = windowManager.createPopupWindow();
      if (popup.webContents.isLoading()) {
        popup.webContents.once('did-finish-load', () => {
          if (!popup.isDestroyed()) {
            popup.webContents.send(IPC.BROWSER_DOWNLOAD_INTERCEPTED, payload);
          }
        });
      } else {
        popup.webContents.send(IPC.BROWSER_DOWNLOAD_INTERCEPTED, payload);
      }

      const currentMain = windowManager.getMainWindow();
      if (currentMain && !currentMain.isDestroyed()) {
        currentMain.webContents.send(IPC.BROWSER_DOWNLOAD_INTERCEPTED, payload);
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    nativeMessagingHost?.stop();
    torrentManager?.destroy();
    database?.close();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
