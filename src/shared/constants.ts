// ============================================================================
// Anything Download Manager — Shared Constants
// ============================================================================

/** Default number of segments per download */
export const DEFAULT_SEGMENT_COUNT = 8;

/** Maximum number of segments per download */
export const MAX_SEGMENT_COUNT = 32;

/** Minimum segment size in bytes (1 MB) */
export const MIN_SEGMENT_SIZE = 1024 * 1024;

/** Maximum concurrent downloads */
export const DEFAULT_MAX_CONCURRENT = 3;

/** Default speed limit (0 = unlimited) */
export const DEFAULT_SPEED_LIMIT = 0;

/** Minimum file size to intercept from browser (100 KB) */
export const DEFAULT_MIN_INTERCEPT_SIZE = 100 * 1024;

/** Auto-retry count */
export const DEFAULT_AUTO_RETRY_COUNT = 3;

/** Auto-retry delay in seconds */
export const DEFAULT_AUTO_RETRY_DELAY = 5;

/** Torrent seed ratio limit */
export const DEFAULT_SEED_RATIO_LIMIT = 2.0;

/** Download progress update interval in ms */
export const PROGRESS_UPDATE_INTERVAL = 500;

/** Speed calculation window in ms */
export const SPEED_CALC_WINDOW = 3000;

/** App name */
export const APP_NAME = 'Anything Download Manager';

/** App short name */
export const APP_SHORT_NAME = 'ADM';

/** Native messaging host name */
export const NATIVE_MESSAGING_HOST_NAME = 'com.adm.native_messaging';

/** WebSocket port for browser communication fallback */
export const WEBSOCKET_PORT = 28370;

/** File extension to category mapping */
export const EXTENSION_CATEGORY_MAP: Record<string, string> = {
  // Video
  mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', wmv: 'video',
  flv: 'video', webm: 'video', m4v: 'video', '3gp': 'video', mpg: 'video',
  mpeg: 'video', ts: 'video',

  // Audio
  mp3: 'audio', flac: 'audio', wav: 'audio', aac: 'audio', ogg: 'audio',
  wma: 'audio', m4a: 'audio', opus: 'audio',

  // Documents
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document',
  xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
  csv: 'document', rtf: 'document', odt: 'document', epub: 'document',

  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive', iso: 'archive',

  // Programs
  exe: 'program', msi: 'program', dmg: 'program', pkg: 'program',
  deb: 'program', rpm: 'program', appimage: 'program', apk: 'program',

  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image',
  svg: 'image', webp: 'image', ico: 'image', tiff: 'image', psd: 'image',

  // Torrent
  torrent: 'torrent',
};

/** Default file extensions to intercept from browser */
export const DEFAULT_INTERCEPT_EXTENSIONS = [
  // Video
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
  // Audio
  'mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz', 'iso',
  // Programs
  'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage', 'apk',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'epub',
  // Torrents
  'torrent',
];

/** MIME types for media detection */
export const MEDIA_MIME_TYPES = [
  'video/mp4', 'video/webm', 'video/x-matroska', 'video/avi',
  'video/quicktime', 'video/x-flv', 'video/x-ms-wmv',
  'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/wav',
  'audio/ogg', 'audio/aac', 'audio/x-m4a',
  'application/x-bittorrent',
];
