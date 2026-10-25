// ============================================================================
// Anything Download Manager — Pure Cross-Platform Resilient Database Store
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

export class AppDatabase {
  private static instance: AppDatabase | null = null;
  private filePath: string;
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

  private save(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err: any) {
      console.error('[ADM Database] Failed to persist data to disk:', err.message);
    }
  }

  // ─── Download Operations ──────────────────────────────────────────────────

  public saveDownload(task: DownloadTask): void {
    this.data.downloads[task.id] = { ...task };
    this.save();
  }

  public getAllDownloads(): DownloadTask[] {
    return Object.values(this.data.downloads).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }

  public getDownloadById(id: string): DownloadTask | null {
    return this.data.downloads[id] || null;
  }

  public deleteDownload(id: string): void {
    if (this.data.downloads[id]) {
      delete this.data.downloads[id];
      this.save();
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
      this.save();
    }
  }

  // ─── Torrent Operations ───────────────────────────────────────────────────

  public saveTorrent(torrent: TorrentTask): void {
    this.data.torrents[torrent.id] = { ...torrent };
    this.save();
  }

  public getAllTorrents(): TorrentTask[] {
    return Object.values(this.data.torrents).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }

  public deleteTorrent(id: string): void {
    if (this.data.torrents[id]) {
      delete this.data.torrents[id];
      this.save();
    }
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  public getStats(): DownloadStats {
    const tasks = Object.values(this.data.downloads);
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const totalBytes = tasks.reduce((sum, t) => sum + (t.downloadedSize || 0), 0);
    return {
      totalDownloads: tasks.length,
      completedDownloads: completed,
      totalDownloadedBytes: totalBytes,
      averageSpeed: 0,
    };
  }

  public close(): void {
    this.save();
  }
}
