// ============================================================================
// Anything Download Manager — Preload Script
// ============================================================================
// This script runs in a privileged context and exposes a safe API to the
// renderer process via contextBridge.

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type {
  NewDownloadRequest,
  DownloadTask,
  DownloadProgress,
  TorrentTask,
  AppSettings,
  UrlInfo,
  DownloadStats,
  UpdateCheckResult,
} from '../shared/types';

// Type-safe API exposed to the renderer
const electronAPI = {
  // ─── Download Management ────────────────────────────────────────────────
  addDownload: (request: NewDownloadRequest): Promise<DownloadTask> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_ADD, request),

  pauseDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_PAUSE, id),

  resumeDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_RESUME, id),

  cancelDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_CANCEL, id),

  removeDownload: (id: string, deleteFile: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_REMOVE, id, deleteFile),

  retryDownload: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_RETRY, id),

  openFile: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_OPEN_FILE, id),

  openFolder: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_OPEN_FOLDER, id),

  getAllDownloads: (): Promise<DownloadTask[]> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_GET_ALL),

  getDownloadById: (id: string): Promise<DownloadTask | null> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_GET_BY_ID, id),

  clearCompleted: (): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_CLEAR_COMPLETED),

  // ─── URL Resolution ─────────────────────────────────────────────────────
  resolveUrl: (url: string): Promise<UrlInfo> =>
    ipcRenderer.invoke(IPC.URL_RESOLVE, url),

  // ─── Torrent Management ─────────────────────────────────────────────────
  addTorrent: (magnetUri: string, savePath?: string): Promise<TorrentTask> =>
    ipcRenderer.invoke(IPC.TORRENT_ADD, magnetUri, savePath),

  addTorrentFile: (filePath: string, savePath?: string): Promise<TorrentTask> =>
    ipcRenderer.invoke(IPC.TORRENT_ADD_FILE, filePath, savePath),

  pauseTorrent: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.TORRENT_PAUSE, id),

  resumeTorrent: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.TORRENT_RESUME, id),

  removeTorrent: (id: string, deleteFiles: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC.TORRENT_REMOVE, id, deleteFiles),

  getAllTorrents: (): Promise<TorrentTask[]> =>
    ipcRenderer.invoke(IPC.TORRENT_GET_ALL),

  // ─── Settings ───────────────────────────────────────────────────────────
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  resetSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_RESET),

  // ─── Dialogs ────────────────────────────────────────────────────────────
  selectFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_SELECT_FOLDER, defaultPath),

  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke(IPC.DIALOG_SELECT_FILE, filters),

  // ─── App ────────────────────────────────────────────────────────────────
  minimizeToTray: (): void => ipcRenderer.send(IPC.APP_MINIMIZE_TO_TRAY),
  quit: (): void => ipcRenderer.send(IPC.APP_QUIT),
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getPlatform: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_PLATFORM),
  closePopup: (): void => ipcRenderer.send(IPC.APP_CLOSE_POPUP),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.APP_OPEN_EXTERNAL, url),
  getSystemInfo: (): Promise<Record<string, string>> => ipcRenderer.invoke(IPC.APP_GET_SYSTEM_INFO),
  checkForUpdates: (): Promise<UpdateCheckResult> => ipcRenderer.invoke(IPC.APP_CHECK_FOR_UPDATES),

  // ─── Statistics ─────────────────────────────────────────────────────────
  getStats: (): Promise<DownloadStats> => ipcRenderer.invoke(IPC.STATS_GET),

  // ─── Event Listeners ───────────────────────────────────────────────────
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const handler = (_event: IpcRendererEvent, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on(IPC.DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.DOWNLOAD_PROGRESS, handler);
  },

  onDownloadStatusChanged: (callback: (task: DownloadTask) => void) => {
    const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC.DOWNLOAD_STATUS_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.DOWNLOAD_STATUS_CHANGED, handler);
  },

  onDownloadAdded: (callback: (task: DownloadTask) => void) => {
    const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC.DOWNLOAD_ADDED, handler);
    return () => ipcRenderer.removeListener(IPC.DOWNLOAD_ADDED, handler);
  },

  onDownloadCompleted: (callback: (task: DownloadTask) => void) => {
    const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task);
    ipcRenderer.on(IPC.DOWNLOAD_COMPLETED, handler);
    return () => ipcRenderer.removeListener(IPC.DOWNLOAD_COMPLETED, handler);
  },

  onDownloadError: (callback: (data: { id: string; error: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { id: string; error: string }) => callback(data);
    ipcRenderer.on(IPC.DOWNLOAD_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.DOWNLOAD_ERROR, handler);
  },

  onBrowserDownloadIntercepted: (callback: (data: NewDownloadRequest) => void) => {
    const handler = (_event: IpcRendererEvent, data: NewDownloadRequest) => callback(data);
    ipcRenderer.on(IPC.BROWSER_DOWNLOAD_INTERCEPTED, handler);
    return () => ipcRenderer.removeListener(IPC.BROWSER_DOWNLOAD_INTERCEPTED, handler);
  },

  onTorrentProgress: (callback: (task: TorrentTask) => void) => {
    const handler = (_event: IpcRendererEvent, task: TorrentTask) => callback(task);
    ipcRenderer.on(IPC.TORRENT_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.TORRENT_PROGRESS, handler);
  },
};

// Expose the API to the renderer via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer
export type ElectronAPI = typeof electronAPI;
