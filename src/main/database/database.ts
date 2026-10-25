// ============================================================================
// Anything Download Manager — Resilient SQLite Database with JSON Fallback
// ============================================================================

import fs from 'fs';
import path from 'path';
import { getAppDataPath } from '../utils/platform-utils';
import { ensureDir } from '../utils/file-utils';
import type { DownloadTask, TorrentTask, DownloadStats } from '../../shared/types';
import {
  DbDownloadRow,
  DbSegmentRow,
  DbTorrentRow,
  dbRowToDownloadTask,
  downloadTaskToDbRow,
  dbRowToTorrentTask,
} from './models';

export class AppDatabase {
  private static instance: AppDatabase | null = null;
  private db: any = null;
  private isSqlite = false;
  private fallbackData: {
    downloads: Record<string, DownloadTask>;
    torrents: Record<string, TorrentTask>;
  } = { downloads: {}, torrents: {} };
  private jsonBackupPath: string;

  private constructor() {
    const appDir = getAppDataPath();
    ensureDir(appDir);
    const dbPath = path.join(appDir, 'adm_data.db');
    this.jsonBackupPath = path.join(appDir, 'adm_data.json');

    try {
      const BetterSqlite3 = require('better-sqlite3');
      this.db = new BetterSqlite3(dbPath);
      this.initTables();
      this.isSqlite = true;
    } catch (err: any) {
      console.warn(
        '[ADM Database] Native SQLite unavailable, falling back to JSON persistence store:',
        err.message
      );
      this.isSqlite = false;
      this.loadJsonBackup();
    }
  }

  public static getInstance(): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase();
    }
    return AppDatabase.instance;
  }

  private initTables(): void {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        save_path TEXT NOT NULL,
        total_size INTEGER DEFAULT -1,
        downloaded_size INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        category TEXT DEFAULT 'general',
        segment_count INTEGER DEFAULT 8,
        speed REAL DEFAULT 0,
        average_speed REAL DEFAULT 0,
        progress REAL DEFAULT 0,
        resumable INTEGER DEFAULT 0,
        mime_type TEXT,
        referrer TEXT,
        headers TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        download_id TEXT NOT NULL,
        segment_index INTEGER NOT NULL,
        start_byte INTEGER NOT NULL,
        end_byte INTEGER NOT NULL,
        downloaded_bytes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        temp_file_path TEXT NOT NULL,
        FOREIGN KEY (download_id) REFERENCES downloads(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS torrents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        info_hash TEXT NOT NULL,
        magnet_uri TEXT,
        torrent_file_path TEXT,
        save_path TEXT NOT NULL,
        total_size INTEGER DEFAULT 0,
        downloaded_size INTEGER DEFAULT 0,
        uploaded_size INTEGER DEFAULT 0,
        status TEXT DEFAULT 'downloading',
        progress REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
      CREATE INDEX IF NOT EXISTS idx_segments_download_id ON segments(download_id);
    `);
  }

  // ─── JSON Fallback Store Methods ──────────────────────────────────────────

  private loadJsonBackup(): void {
    try {
      if (fs.existsSync(this.jsonBackupPath)) {
        const raw = fs.readFileSync(this.jsonBackupPath, 'utf8');
        this.fallbackData = JSON.parse(raw);
      }
    } catch {
      this.fallbackData = { downloads: {}, torrents: {} };
    }
  }

  private saveJsonBackup(): void {
    try {
      fs.writeFileSync(this.jsonBackupPath, JSON.stringify(this.fallbackData, null, 2), 'utf8');
    } catch {
      // ignore
    }
  }

  // ─── Download Operations ──────────────────────────────────────────────────

  public saveDownload(task: DownloadTask): void {
    if (!this.isSqlite || !this.db) {
      this.fallbackData.downloads[task.id] = { ...task };
      this.saveJsonBackup();
      return;
    }

    try {
      const row = downloadTaskToDbRow(task);
      const upsertDownload = this.db.prepare(`
        INSERT INTO downloads (
          id, url, file_name, save_path, total_size, downloaded_size,
          status, category, segment_count, speed, average_speed, progress,
          resumable, mime_type, referrer, headers, error, created_at, completed_at
        ) VALUES (
          @id, @url, @file_name, @save_path, @total_size, @downloaded_size,
          @status, @category, @segment_count, @speed, @average_speed, @progress,
          @resumable, @mime_type, @referrer, @headers, @error, @created_at, @completed_at
        )
        ON CONFLICT(id) DO UPDATE SET
          file_name = excluded.file_name,
          save_path = excluded.save_path,
          total_size = excluded.total_size,
          downloaded_size = excluded.downloaded_size,
          status = excluded.status,
          category = excluded.category,
          segment_count = excluded.segment_count,
          speed = excluded.speed,
          average_speed = excluded.average_speed,
          progress = excluded.progress,
          resumable = excluded.resumable,
          mime_type = excluded.mime_type,
          referrer = excluded.referrer,
          headers = excluded.headers,
          error = excluded.error,
          completed_at = excluded.completed_at
      `);

      const transaction = this.db.transaction(() => {
        upsertDownload.run(row);

        if (task.segments && task.segments.length > 0) {
          this.db.prepare('DELETE FROM segments WHERE download_id = ?').run(task.id);
          const insertSeg = this.db.prepare(`
            INSERT INTO segments (
              download_id, segment_index, start_byte, end_byte,
              downloaded_bytes, status, temp_file_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const seg of task.segments) {
            insertSeg.run(
              task.id,
              seg.index,
              seg.startByte,
              seg.endByte,
              seg.downloadedBytes,
              seg.status,
              seg.tempFilePath
            );
          }
        }
      });

      transaction();
    } catch (err: any) {
      console.warn('[ADM Database] saveDownload error, saving to JSON fallback:', err.message);
      this.fallbackData.downloads[task.id] = { ...task };
      this.saveJsonBackup();
    }
  }

  public getAllDownloads(): DownloadTask[] {
    if (!this.isSqlite || !this.db) {
      return Object.values(this.fallbackData.downloads);
    }

    try {
      const downloadRows = this.db
        .prepare('SELECT * FROM downloads ORDER BY created_at DESC')
        .all() as DbDownloadRow[];

      const segStmt = this.db.prepare(
        'SELECT * FROM segments WHERE download_id = ? ORDER BY segment_index ASC'
      );

      return downloadRows.map((row) => {
        const segRows = segStmt.all(row.id) as DbSegmentRow[];
        return dbRowToDownloadTask(row, segRows);
      });
    } catch {
      return Object.values(this.fallbackData.downloads);
    }
  }

  public getDownloadById(id: string): DownloadTask | null {
    if (!this.isSqlite || !this.db) {
      return this.fallbackData.downloads[id] || null;
    }

    try {
      const row = this.db.prepare('SELECT * FROM downloads WHERE id = ?').get(id) as
        | DbDownloadRow
        | undefined;
      if (!row) return null;

      const segRows = this.db
        .prepare('SELECT * FROM segments WHERE download_id = ? ORDER BY segment_index ASC')
        .all(id) as DbSegmentRow[];

      return dbRowToDownloadTask(row, segRows);
    } catch {
      return this.fallbackData.downloads[id] || null;
    }
  }

  public deleteDownload(id: string): void {
    if (!this.isSqlite || !this.db) {
      delete this.fallbackData.downloads[id];
      this.saveJsonBackup();
      return;
    }

    try {
      const transaction = this.db.transaction(() => {
        this.db.prepare('DELETE FROM segments WHERE download_id = ?').run(id);
        this.db.prepare('DELETE FROM downloads WHERE id = ?').run(id);
      });
      transaction();
    } catch {
      delete this.fallbackData.downloads[id];
      this.saveJsonBackup();
    }
  }

  public clearCompletedDownloads(): void {
    if (!this.isSqlite || !this.db) {
      for (const [id, t] of Object.entries(this.fallbackData.downloads)) {
        if (t.status === 'completed') {
          delete this.fallbackData.downloads[id];
        }
      }
      this.saveJsonBackup();
      return;
    }

    try {
      const completed = this.db
        .prepare("SELECT id FROM downloads WHERE status = 'completed'")
        .all() as { id: string }[];

      const transaction = this.db.transaction(() => {
        for (const item of completed) {
          this.db.prepare('DELETE FROM segments WHERE download_id = ?').run(item.id);
          this.db.prepare('DELETE FROM downloads WHERE id = ?').run(item.id);
        }
      });
      transaction();
    } catch {
      // ignore
    }
  }

  // ─── Torrent Operations ───────────────────────────────────────────────────

  public saveTorrent(torrent: TorrentTask): void {
    if (!this.isSqlite || !this.db) {
      this.fallbackData.torrents[torrent.id] = { ...torrent };
      this.saveJsonBackup();
      return;
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO torrents (
          id, name, info_hash, magnet_uri, torrent_file_path, save_path,
          total_size, downloaded_size, uploaded_size, status, progress,
          created_at, completed_at, error
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          save_path = excluded.save_path,
          total_size = excluded.total_size,
          downloaded_size = excluded.downloaded_size,
          uploaded_size = excluded.uploaded_size,
          status = excluded.status,
          progress = excluded.progress,
          completed_at = excluded.completed_at,
          error = excluded.error
      `);

      stmt.run(
        torrent.id,
        torrent.name,
        torrent.infoHash,
        torrent.magnetURI,
        torrent.torrentFilePath,
        torrent.savePath,
        torrent.totalSize,
        torrent.downloadedSize,
        torrent.uploadedSize,
        torrent.status,
        torrent.progress,
        torrent.createdAt,
        torrent.completedAt,
        torrent.error
      );
    } catch {
      this.fallbackData.torrents[torrent.id] = { ...torrent };
      this.saveJsonBackup();
    }
  }

  public getAllTorrents(): TorrentTask[] {
    if (!this.isSqlite || !this.db) {
      return Object.values(this.fallbackData.torrents);
    }

    try {
      const rows = this.db
        .prepare('SELECT * FROM torrents ORDER BY created_at DESC')
        .all() as DbTorrentRow[];
      return rows.map(dbRowToTorrentTask);
    } catch {
      return Object.values(this.fallbackData.torrents);
    }
  }

  public deleteTorrent(id: string): void {
    if (!this.isSqlite || !this.db) {
      delete this.fallbackData.torrents[id];
      this.saveJsonBackup();
      return;
    }

    try {
      this.db.prepare('DELETE FROM torrents WHERE id = ?').run(id);
    } catch {
      delete this.fallbackData.torrents[id];
      this.saveJsonBackup();
    }
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  public getStats(): DownloadStats {
    if (!this.isSqlite || !this.db) {
      const tasks = Object.values(this.fallbackData.downloads);
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const totalBytes = tasks.reduce((sum, t) => sum + (t.downloadedSize || 0), 0);
      return {
        totalDownloads: tasks.length,
        completedDownloads: completed,
        totalDownloadedBytes: totalBytes,
        averageSpeed: 0,
      };
    }

    try {
      const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM downloads').get() as {
        count: number;
      };
      const completedRow = this.db
        .prepare("SELECT COUNT(*) as count FROM downloads WHERE status = 'completed'")
        .get() as { count: number };
      const bytesRow = this.db
        .prepare('SELECT SUM(downloaded_size) as total_bytes FROM downloads')
        .get() as { total_bytes: number | null };

      return {
        totalDownloads: totalRow?.count || 0,
        completedDownloads: completedRow?.count || 0,
        totalDownloadedBytes: bytesRow?.total_bytes || 0,
        averageSpeed: 0,
      };
    } catch {
      return {
        totalDownloads: 0,
        completedDownloads: 0,
        totalDownloadedBytes: 0,
        averageSpeed: 0,
      };
    }
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {}
      this.db = null;
    }
  }
}
