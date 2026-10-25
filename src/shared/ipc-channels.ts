// ============================================================================
// Anything Download Manager — IPC Channel Definitions
// ============================================================================
// These channels are used for communication between the Electron main process
// and the renderer process via contextBridge / ipcRenderer.

export const IPC = {
  // ─── Download Management ────────────────────────────────────────────────
  DOWNLOAD_ADD: 'download:add',
  DOWNLOAD_PAUSE: 'download:pause',
  DOWNLOAD_RESUME: 'download:resume',
  DOWNLOAD_CANCEL: 'download:cancel',
  DOWNLOAD_REMOVE: 'download:remove',
  DOWNLOAD_RETRY: 'download:retry',
  DOWNLOAD_OPEN_FILE: 'download:open-file',
  DOWNLOAD_OPEN_FOLDER: 'download:open-folder',
  DOWNLOAD_GET_ALL: 'download:get-all',
  DOWNLOAD_GET_BY_ID: 'download:get-by-id',
  DOWNLOAD_CLEAR_COMPLETED: 'download:clear-completed',

  // ─── Download Events (main → renderer) ──────────────────────────────────
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_STATUS_CHANGED: 'download:status-changed',
  DOWNLOAD_ADDED: 'download:added',
  DOWNLOAD_ERROR: 'download:error',
  DOWNLOAD_COMPLETED: 'download:completed',

  // ─── URL Resolution ─────────────────────────────────────────────────────
  URL_RESOLVE: 'url:resolve',

  // ─── Torrent Management ─────────────────────────────────────────────────
  TORRENT_ADD: 'torrent:add',
  TORRENT_ADD_FILE: 'torrent:add-file',
  TORRENT_PAUSE: 'torrent:pause',
  TORRENT_RESUME: 'torrent:resume',
  TORRENT_REMOVE: 'torrent:remove',
  TORRENT_GET_ALL: 'torrent:get-all',

  // ─── Torrent Events (main → renderer) ──────────────────────────────────
  TORRENT_PROGRESS: 'torrent:progress',
  TORRENT_STATUS_CHANGED: 'torrent:status-changed',

  // ─── Settings ───────────────────────────────────────────────────────────
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',

  // ─── Browser Integration ────────────────────────────────────────────────
  BROWSER_DOWNLOAD_INTERCEPTED: 'browser:download-intercepted',
  BROWSER_MEDIA_DETECTED: 'browser:media-detected',

  // ─── Dialogs ────────────────────────────────────────────────────────────
  DIALOG_SELECT_FOLDER: 'dialog:select-folder',
  DIALOG_SELECT_FILE: 'dialog:select-file',

  // ─── App ────────────────────────────────────────────────────────────────
  APP_MINIMIZE_TO_TRAY: 'app:minimize-to-tray',
  APP_QUIT: 'app:quit',
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PLATFORM: 'app:get-platform',
  APP_SHOW_POPUP: 'app:show-popup',
  APP_CLOSE_POPUP: 'app:close-popup',
  APP_OPEN_EXTERNAL: 'app:open-external',
  APP_GET_SYSTEM_INFO: 'app:get-system-info',

  // ─── Statistics ─────────────────────────────────────────────────────────
  STATS_GET: 'stats:get',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];
