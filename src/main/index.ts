// ============================================================================
// Anything Download Manager — Main Process Entry Point
// ============================================================================

import { app } from 'electron';
import { DownloadManager } from './download/download-manager';
import { TorrentManager } from './torrent/torrent-manager';
import { AppDatabase } from './database/database';
import { WindowManager } from './window-manager';
import { NativeMessagingHost } from './native-messaging';
import { ExtensionInstaller } from './extension-installer';
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
    windowManager?.showMainWindow();

    const lastArg = commandLine[commandLine.length - 1];
    if (lastArg && lastArg.startsWith('magnet:')) {
      torrentManager?.addMagnet(lastArg);
    } else if (lastArg && (lastArg.startsWith('http://') || lastArg.startsWith('https://'))) {
      downloadManager?.addDownload({ url: lastArg });
    }
  });

  app.whenReady().then(async () => {
    // 1. On macOS, offer to move app to /Applications if launched from mounted DMG
    await ExtensionInstaller.ensureInstalledInApplications();

    // 2. Provision bundled browser extension into AppData & register Native Messaging hosts
    ExtensionInstaller.provisionExtension();

    // 3. Initialize Database & Managers
    database = AppDatabase.getInstance();
    downloadManager = DownloadManager.getInstance();
    torrentManager = TorrentManager.getInstance();

    const savedDownloads = database.getAllDownloads();
    for (const task of savedDownloads) {
      downloadManager.restoreTask(task);
    }

    // 4. Initialize WindowManager & System Tray
    windowManager = WindowManager.getInstance();
    const startHidden =
      process.argv.includes('--hidden') ||
      (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden);

    const mainWindow = windowManager.createMainWindow(startHidden);
    createTray(mainWindow);

    // 5. Register IPC Handlers & Apply Persisted Settings
    registerIPCHandlers(downloadManager, torrentManager, database, windowManager);

    // 6. Setup Browser Extension Integration Gateway
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
      windowManager.showMainWindow();
    });
  });

  app.on('before-quit', () => {
    windowManager?.setQuitting(true);
    nativeMessagingHost?.stop();
    torrentManager?.destroy();
    database?.close();
  });

  app.on('window-all-closed', () => {
    // Keep ADM running in the system tray on all platforms unless explicitly quitting
    if (windowManager?.isAppQuitting() || !windowManager?.getMinimizeToTray()) {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    }
  });
}
