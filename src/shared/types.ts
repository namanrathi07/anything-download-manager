// ============================================================================
// Anything Download Manager — Shared Type Definitions
// ============================================================================

// ─── Download Types ─────────────────────────────────────────────────────────

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'queued'
  | 'merging';

export type SegmentStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export type DownloadCategory =
  | 'general'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'program'
  | 'image'
  | 'torrent';

export interface DownloadSegment {
  id: number;
  downloadId: string;
  index: number;
  startByte: number;
  endByte: number;
  downloadedBytes: number;
  status: SegmentStatus;
  speed: number; // bytes per second
  tempFilePath: string;
}

export interface DownloadTask {
  id: string;
  url: string;
  fileName: string;
  savePath: string;
  totalSize: number; // -1 if unknown
  downloadedSize: number;
  status: DownloadStatus;
  category: DownloadCategory;
  segments: DownloadSegment[];
  segmentCount: number;
  speed: number; // bytes per second
  averageSpeed: number;
  progress: number; // 0-100
  resumable: boolean;
  createdAt: string; // ISO date
  completedAt: string | null;
  error: string | null;
  headers: Record<string, string>;
  mimeType: string | null;
  referrer: string | null;
}

// ─── Torrent Types ──────────────────────────────────────────────────────────

export type TorrentStatus =
  | 'downloading'
  | 'seeding'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'checking';

export interface TorrentFile {
  name: string;
  path: string;
  length: number;
  downloaded: number;
  selected: boolean;
}

export interface TorrentTask {
  id: string;
  name: string;
  infoHash: string;
  magnetURI: string | null;
  torrentFilePath: string | null;
  savePath: string;
  totalSize: number;
  downloadedSize: number;
  uploadedSize: number;
  status: TorrentStatus;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
  seeds: number;
  ratio: number;
  files: TorrentFile[];
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

// ─── Settings Types ─────────────────────────────────────────────────────────

export interface AppSettings {
  // General
  defaultSavePath: string;
  launchAtStartup: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;

  // Downloads
  maxConcurrentDownloads: number;
  defaultSegmentCount: number;
  maxSegmentCount: number;
  minSegmentSize: number; // bytes — don't split below this
  autoStartDownloads: boolean;
  speedLimit: number; // 0 = unlimited, bytes per second
  autoRetryCount: number;
  autoRetryDelay: number; // seconds

  // Categories / Paths
  categoryPaths: Record<DownloadCategory, string>;

  // Browser Integration
  browserIntegrationEnabled: boolean;
  interceptDownloads: boolean;
  minInterceptSize: number; // bytes — only intercept files larger than this
  interceptFileTypes: string[]; // file extensions to intercept
  excludedUrls: string[]; // URL patterns to skip

  // Torrent
  torrentEnabled: boolean;
  torrentSavePath: string;
  maxUploadSpeed: number; // 0 = unlimited
  maxDownloadSpeed: number; // 0 = unlimited
  seedRatioLimit: number;
  dhtEnabled: boolean;
  pexEnabled: boolean;

  // Proxy
  proxyEnabled: boolean;
  proxyType: 'http' | 'socks4' | 'socks5';
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
}

// ─── IPC Message Types ──────────────────────────────────────────────────────

export interface NewDownloadRequest {
  url: string;
  fileName?: string;
  savePath?: string;
  headers?: Record<string, string>;
  referrer?: string;
  segmentCount?: number;
  autoStart?: boolean;
  category?: DownloadCategory;
}

export interface UrlInfo {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  resumable: boolean;
  headers: Record<string, string>;
}

export interface DownloadProgress {
  id: string;
  downloadedSize: number;
  totalSize: number;
  speed: number;
  averageSpeed: number;
  progress: number;
  status: DownloadStatus;
  segments: SegmentProgress[];
}

export interface SegmentProgress {
  index: number;
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: SegmentStatus;
}

// ─── Browser Extension Messages ─────────────────────────────────────────────

export interface BrowserDownloadMessage {
  type: 'new-download';
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  referrer: string;
  headers: Record<string, string>;
  cookies: string;
}

export interface BrowserMediaMessage {
  type: 'media-detected';
  url: string;
  pageUrl: string;
  pageTitle: string;
  mimeType: string;
  fileSize: number;
}

export type BrowserMessage = BrowserDownloadMessage | BrowserMediaMessage;

// ─── Statistics ─────────────────────────────────────────────────────────────

export interface DownloadStats {
  totalDownloads: number;
  completedDownloads: number;
  totalDownloadedBytes: number;
  averageSpeed: number;
}
