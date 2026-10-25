// ============================================================================
// Anything Download Manager — IPC Handlers
// ============================================================================

import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import path from 'path';
import https from 'https';
import { IPC } from '../shared/ipc-channels';
import type { DownloadManager } from './download/download-manager';
import type { TorrentManager } from './torrent/torrent-manager';
import type { AppDatabase } from './database/database';
import type { WindowManager } from './window-manager';
import { UrlResolver } from './download/url-resolver';
import { getPlatform, getDefaultDownloadPath } from './utils/platform-utils';
import type { AppSettings, NewDownloadRequest, UpdateCheckResult } from '../shared/types';
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
    sendToAllWindows(IPC.DOWNLOAD_REMOVED, id);
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
    downloadManager.removeDownload(id, true);
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

  ipcMain.handle(IPC.APP_CHECK_FOR_UPDATES, async (): Promise<UpdateCheckResult> => {
    const currentVersion = app.getVersion() || '1.0.0';
    try {
      const releaseData = await new Promise<any>((resolve, reject) => {
        const req = https.get(
          'https://api.github.com/repos/namanrathi07/anything-download-manager/releases/latest',
          {
            headers: {
              'User-Agent': 'Anything-Download-Manager',
              Accept: 'application/vnd.github.v3+json',
            },
            timeout: 10000,
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              https
                .get(
                  res.headers.location,
                  { headers: { 'User-Agent': 'Anything-Download-Manager' } },
                  (redirRes) => {
                    let data = '';
                    redirRes.on('data', (chunk) => (data += chunk));
                    redirRes.on('end', () => {
                      try {
                        resolve(JSON.parse(data));
                      } catch (e) {
                        reject(e);
                      }
                    });
                  }
                )
                .on('error', reject);
              return;
            }

            if (res.statusCode !== 200) {
              return reject(new Error(`GitHub API returned status ${res.statusCode}`));
            }

            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          }
        );

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy(new Error('Update check request timed out'));
        });
      });

      const latestTag = releaseData.tag_name || '';
      const cleanCurrent = currentVersion.replace(/^v/, '');
      const cleanLatest = latestTag.replace(/^v/, '');

      const isNewer = (curr: string, lat: string) => {
        const cParts = curr.split('.').map((n) => parseInt(n, 10) || 0);
        const lParts = lat.split('.').map((n) => parseInt(n, 10) || 0);
        for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
          const c = cParts[i] || 0;
          const l = lParts[i] || 0;
          if (l > c) return true;
          if (l < c) return false;
        }
        return false;
      };

      const hasUpdate = isNewer(cleanCurrent, cleanLatest);

      // Find matching asset for user's platform
      const assets: Array<{ name: string; browser_download_url: string; size: number }> =
        releaseData.assets || [];

      let matchingAsset: { name: string; browser_download_url: string; size: number } | undefined;
      const platform = process.platform;
      const arch = process.arch;

      if (platform === 'win32') {
        matchingAsset = assets.find((a) => a.name.endsWith('.exe'));
      } else if (platform === 'darwin') {
        if (arch === 'arm64') {
          matchingAsset = assets.find((a) => a.name.includes('arm64.dmg') || a.name.includes('arm64'));
        } else {
          matchingAsset = assets.find((a) => a.name.includes('x64.dmg') || a.name.includes('x64'));
        }
        if (!matchingAsset) matchingAsset = assets.find((a) => a.name.endsWith('.dmg'));
      } else if (platform === 'linux') {
        matchingAsset = assets.find((a) => a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));
      }

      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestTag || currentVersion,
        releaseName: releaseData.name || latestTag,
        releaseUrl:
          releaseData.html_url ||
          'https://github.com/namanrathi07/anything-download-manager/releases/latest',
        releaseNotes: releaseData.body || '',
        publishedAt: releaseData.published_at || '',
        downloadUrl: matchingAsset?.browser_download_url || releaseData.html_url,
        downloadFileName: matchingAsset?.name,
        downloadSize: matchingAsset?.size,
      };
    } catch (err: any) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseName: `v${currentVersion}`,
        releaseUrl: 'https://github.com/namanrathi07/anything-download-manager/releases/latest',
        releaseNotes: '',
        publishedAt: '',
        error: err.message,
      };
    }
  });
}
