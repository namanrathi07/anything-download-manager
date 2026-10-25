// ============================================================================
// Anything Download Manager — Non-Blocking Debounced Atomic Database Store
// ============================================================================

import fs from 'fs';
import path from 'path';
import { getAppDataPath } from '../utils/platform-utils';
import { ensureDir } from '../utils/file-utils';
import type { DownloadTask, TorrentTask, DownloadStats } from '../../shared/types';

interface DatabaseSchema {
  version: number;
  downloads: Record<string, DownloadTask>;
  torrents: Record<string, TorrentTask>;
}

const SAVE_DEBOUNCE_MS = 500;

export class AppDatabase {
  private static instance: AppDatabase | null = null;
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private isWriting = false;
  private pendingWrite = false;
  private data: DatabaseSchema = {
    version: 1,
    downloads: {},
    torrents: {},
  };

  private constructor() {
    const appDir = getAppDataPath();
    ensureDir(appDir);
    this.filePath = path.join(appDir, 'adm_data.json');
    this.load();
  }

  public static getInstance(): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase();
    }
    return AppDatabase.instance;
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data = {
            version: parsed.version || 1,
            downloads: parsed.downloads || {},
            torrents: parsed.torrents || {},
          };
        }
      }
    } catch (err: any) {
      console.warn('[ADM Database] Failed to load store, initializing fresh state:', err.message);
      this.data = { version: 1, downloads: {}, torrents: {} };
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flushAsync();
    }, SAVE_DEBOUNCE_MS);
  }

  private async flushAsync(): Promise<void> {
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }
    this.isWriting = true;
    try {
      const tempPath = `${this.filePath}.tmp`;
      const payload = JSON.stringify(this.data);
      await fs.promises.writeFile(tempPath, payload, 'utf8');
      await fs.promises.rename(tempPath, this.filePath);
    } catch (err: any) {
      console.error('[ADM Database] Async persist failed:', err.message);
    } finally {
      this.isWriting = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        void this.flushAsync();
      }
    }
  }

  private flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err: any) {
      console.error('[ADM Database] Sync persist failed:', err.message);
    }
  }

  public saveDownload(task: DownloadTask): void {
    this.data.downloads[task.id] = { ...task };
    this.scheduleSave();
  }

  public getAllDownloads(): DownloadTask[] {
    return Object.values(this.data.downloads).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  public getDownloadById(id: string): DownloadTask | null {
    return this.data.downloads[id] || null;
  }

  public deleteDownload(id: string): void {
    if (this.data.downloads[id]) {
      delete this.data.downloads[id];
      this.scheduleSave();
    }
  }

  public clearCompletedDownloads(): void {
    let changed = false;
    for (const [id, task] of Object.entries(this.data.downloads)) {
      if (task.status === 'completed') {
        delete this.data.downloads[id];
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  public saveTorrent(torrent: TorrentTask): void {
    this.data.torrents[torrent.id] = { ...torrent };
    this.scheduleSave();
  }

  public getAllTorrents(): TorrentTask[] {
    return Object.values(this.data.torrents).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  public deleteTorrent(id: string): void {
    if (this.data.torrents[id]) {
      delete this.data.torrents[id];
      this.scheduleSave();
    }
  }

  public getStats(): DownloadStats {
    const tasks = Object.values(this.data.downloads);
    let completed = 0;
    let totalBytes = 0;
    for (const t of tasks) {
      if (t.status === 'completed') completed++;
      totalBytes += t.downloadedSize || 0;
    }
    return {
      totalDownloads: tasks.length,
      completedDownloads: completed,
      totalDownloadedBytes: totalBytes,
      averageSpeed: 0,
    };
  }

  public close(): void {
    this.flushSync();
  }
}
