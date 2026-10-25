// ============================================================================
// Anything Download Manager — IPC Handlers
// ============================================================================

import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import path from 'path';
import { IPC } from '../shared/ipc-channels';
import type { DownloadManager } from './download/download-manager';
import type { TorrentManager } from './torrent/torrent-manager';
import type { AppDatabase } from './database/database';
import type { WindowManager } from './window-manager';
import { UrlResolver } from './download/url-resolver';
import { getPlatform, getDefaultDownloadPath } from './utils/platform-utils';
import type { AppSettings, NewDownloadRequest } from '../shared/types';
import {
  DEFAULT_MAX_CONCURRENT,
  DEFAULT_SEGMENT_COUNT,
  MAX_SEGMENT_COUNT,
  MIN_SEGMENT_SIZE,
  DEFAULT_SPEED_LIMIT,
  DEFAULT_MIN_INTERCEPT_SIZE,
  DEFAULT_AUTO_RETRY_COUNT,
  DEFAULT_AUTO_RETRY_DELAY,
  DEFAULT_SEED_RATIO_LIMIT,
  DEFAULT_INTERCEPT_EXTENSIONS,
} from '../shared/constants';

const defaultSettings: AppSettings = {
  defaultSavePath: getDefaultDownloadPath(),
  launchAtStartup: false,
  minimizeToTray: true,
  showNotifications: true,
  theme: 'dark',
  language: 'en',
  maxConcurrentDownloads: DEFAULT_MAX_CONCURRENT,
  defaultSegmentCount: DEFAULT_SEGMENT_COUNT,
  maxSegmentCount: MAX_SEGMENT_COUNT,
  minSegmentSize: MIN_SEGMENT_SIZE,
  autoStartDownloads: true,
  speedLimit: DEFAULT_SPEED_LIMIT,
  autoRetryCount: DEFAULT_AUTO_RETRY_COUNT,
  autoRetryDelay: DEFAULT_AUTO_RETRY_DELAY,
  categoryPaths: {
    general: path.join(getDefaultDownloadPath(), 'General'),
    video: path.join(getDefaultDownloadPath(), 'Videos'),
    audio: path.join(getDefaultDownloadPath(), 'Music'),
    document: path.join(getDefaultDownloadPath(), 'Documents'),
    archive: path.join(getDefaultDownloadPath(), 'Archives'),
    program: path.join(getDefaultDownloadPath(), 'Programs'),
    image: path.join(getDefaultDownloadPath(), 'Pictures'),
    torrent: path.join(getDefaultDownloadPath(), 'Torrents'),
  },
  browserIntegrationEnabled: true,
  interceptDownloads: true,
  minInterceptSize: DEFAULT_MIN_INTERCEPT_SIZE,
  interceptFileTypes: DEFAULT_INTERCEPT_EXTENSIONS,
  excludedUrls: [],
  torrentEnabled: true,
  torrentSavePath: path.join(getDefaultDownloadPath(), 'Torrents'),
  maxUploadSpeed: 0,
  maxDownloadSpeed: 0,
  seedRatioLimit: DEFAULT_SEED_RATIO_LIMIT,
  dhtEnabled: true,
  pexEnabled: true,
  proxyEnabled: false,
  proxyType: 'http',
  proxyHost: '',
  proxyPort: 8080,
  proxyUsername: '',
  proxyPassword: '',
};

let currentSettings: AppSettings = { ...defaultSettings };

export function registerIPCHandlers(
  downloadManager: DownloadManager,
  torrentManager: TorrentManager,
  database: AppDatabase,
  windowManager: WindowManager
): void {
  // Broadcast helper
  const sendToAllWindows = (channel: string, ...args: any[]) => {
    const main = windowManager.getMainWindow();
    if (main && !main.isDestroyed()) {
      main.webContents.send(channel, ...args);
    }
    const popup = windowManager.getPopupWindow();
    if (popup && !popup.isDestroyed()) {
      popup.webContents.send(channel, ...args);
    }
  };

  // Wire DownloadManager events to IPC + Database
  downloadManager.on('task-added', (task) => {
    database.saveDownload(task);
    sendToAllWindows(IPC.DOWNLOAD_ADDED, task);
  });

  downloadManager.on('progress', (progress) => {
    sendToAllWindows(IPC.DOWNLOAD_PROGRESS, progress);
  });

  downloadManager.on('status-changed', (task) => {
    database.saveDownload(task);
    sendToAllWindows(IPC.DOWNLOAD_STATUS_CHANGED, task);
  });

  downloadManager.on('completed', (task) => {
    database.saveDownload(task);
    sendToAllWindows(IPC.DOWNLOAD_COMPLETED, task);
  });

  downloadManager.on('error', (errData) => {
    sendToAllWindows(IPC.DOWNLOAD_ERROR, errData);
  });

  downloadManager.on('task-removed', (id) => {
    database.deleteDownload(id);
  });

  // Wire TorrentManager events
  torrentManager.on('torrent-added', (task) => {
    database.saveTorrent(task);
    sendToAllWindows(IPC.TORRENT_STATUS_CHANGED, task);
  });

  torrentManager.on('progress', (task) => {
    sendToAllWindows(IPC.TORRENT_PROGRESS, task);
  });

  torrentManager.on('status-changed', (task) => {
    database.saveTorrent(task);
    sendToAllWindows(IPC.TORRENT_STATUS_CHANGED, task);
  });

  torrentManager.on('completed', (task) => {
    database.saveTorrent(task);
    sendToAllWindows(IPC.TORRENT_STATUS_CHANGED, task);
  });

  torrentManager.on('torrent-removed', (id) => {
    database.deleteTorrent(id);
  });

  // ─── Download Handlers ────────────────────────────────────────────────────

  ipcMain.handle(IPC.DOWNLOAD_ADD, async (_event, req: NewDownloadRequest) => {
    return await downloadManager.addDownload(req);
  });

  ipcMain.handle(IPC.DOWNLOAD_PAUSE, (_event, id: string) => {
    downloadManager.pauseDownload(id);
  });

  ipcMain.handle(IPC.DOWNLOAD_RESUME, (_event, id: string) => {
    downloadManager.resumeDownload(id);
  });

  ipcMain.handle(IPC.DOWNLOAD_CANCEL, (_event, id: string) => {
    downloadManager.cancelDownload(id);
  });

  ipcMain.handle(IPC.DOWNLOAD_REMOVE, (_event, id: string, deleteFile = false) => {
    downloadManager.removeDownload(id, deleteFile);
  });

  ipcMain.handle(IPC.DOWNLOAD_RETRY, (_event, id: string) => {
    downloadManager.retryDownload(id);
  });

  ipcMain.handle(IPC.DOWNLOAD_OPEN_FILE, (_event, id: string) => {
    const task = downloadManager.getTask(id) || database.getDownloadById(id);
    if (task && task.savePath) {
      shell.openPath(task.savePath);
    }
  });

  ipcMain.handle(IPC.DOWNLOAD_OPEN_FOLDER, (_event, id: string) => {
    const task = downloadManager.getTask(id) || database.getDownloadById(id);
    if (task && task.savePath) {
      shell.showItemInFolder(task.savePath);
    }
  });

  ipcMain.handle(IPC.DOWNLOAD_GET_ALL, () => {
    return downloadManager.getAllTasks();
  });

  ipcMain.handle(IPC.DOWNLOAD_GET_BY_ID, (_event, id: string) => {
    return downloadManager.getTask(id) || database.getDownloadById(id);
  });

  ipcMain.handle(IPC.DOWNLOAD_CLEAR_COMPLETED, () => {
    downloadManager.clearCompleted();
    database.clearCompletedDownloads();
  });

  // ─── URL Resolver ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC.URL_RESOLVE, async (_event, url: string) => {
    return await UrlResolver.resolve(url);
  });

  // ─── Torrent Handlers ─────────────────────────────────────────────────────

  ipcMain.handle(IPC.TORRENT_ADD, async (_event, magnetUri: string, savePath?: string) => {
    return await torrentManager.addMagnet(magnetUri, savePath);
  });

  ipcMain.handle(IPC.TORRENT_ADD_FILE, async (_event, filePath: string, savePath?: string) => {
    return await torrentManager.addTorrentFile(filePath, savePath);
  });

  ipcMain.handle(IPC.TORRENT_PAUSE, (_event, id: string) => {
    torrentManager.pauseTorrent(id);
  });

  ipcMain.handle(IPC.TORRENT_RESUME, (_event, id: string) => {
    torrentManager.resumeTorrent(id);
  });

  ipcMain.handle(IPC.TORRENT_REMOVE, (_event, id: string, deleteFiles = false) => {
    torrentManager.removeTorrent(id, deleteFiles);
  });

  ipcMain.handle(IPC.TORRENT_GET_ALL, () => {
    return torrentManager.getAllTorrents();
  });

  // ─── Settings Handlers ────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return currentSettings;
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_event, newSettings: Partial<AppSettings>) => {
    currentSettings = { ...currentSettings, ...newSettings };
    if (newSettings.maxConcurrentDownloads) {
      downloadManager.setMaxConcurrent(newSettings.maxConcurrentDownloads);
    }
  });

  ipcMain.handle(IPC.SETTINGS_RESET, () => {
    currentSettings = { ...defaultSettings };
    return currentSettings;
  });

  // ─── Dialog Handlers ──────────────────────────────────────────────────────

  ipcMain.handle(IPC.DIALOG_SELECT_FOLDER, async (_event, defaultPath?: string) => {
    const main = windowManager.getMainWindow();
    const result = await dialog.showOpenDialog(main || undefined as any, {
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: defaultPath || getDefaultDownloadPath(),
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle(
    IPC.DIALOG_SELECT_FILE,
    async (_event, filters?: { name: string; extensions: string[] }[]) => {
      const main = windowManager.getMainWindow();
      const result = await dialog.showOpenDialog(main || undefined as any, {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      });
      if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
      }
      return null;
    }
  );

  // ─── App Level ────────────────────────────────────────────────────────────

  ipcMain.on(IPC.APP_MINIMIZE_TO_TRAY, () => {
    const main = windowManager.getMainWindow();
    if (main) main.hide();
  });

  ipcMain.on(IPC.APP_QUIT, () => {
    app.quit();
  });

  ipcMain.handle(IPC.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC.APP_GET_PLATFORM, () => {
    return getPlatform();
  });

  ipcMain.on(IPC.APP_SHOW_POPUP, () => {
    windowManager.createPopupWindow();
  });

  ipcMain.on(IPC.APP_CLOSE_POPUP, () => {
    windowManager.closePopupWindow();
  });

  ipcMain.handle(IPC.STATS_GET, () => {
    return database.getStats();
  });

  ipcMain.handle(IPC.APP_OPEN_EXTERNAL, (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:'))) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle(IPC.APP_GET_SYSTEM_INFO, () => {
    const os = require('os');
    return {
      version: app.getVersion() || '1.0.0',
      electron: process.versions.electron || '33.2.0',
      node: process.versions.node,
      chrome: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
      osRelease: os.release(),
      totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
      freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
    };
  });
}
