// ============================================================================
// Anything Download Manager — Torrent Task
// ============================================================================

import type { TorrentTask, TorrentStatus } from '../../shared/types';

export class TorrentTaskWrapper {
  public task: TorrentTask;
  public nativeTorrent: any | null = null;

  constructor(task: TorrentTask, nativeTorrent?: any) {
    this.task = task;
    this.nativeTorrent = nativeTorrent || null;
    if (this.nativeTorrent) {
      this.syncWithNative();
    }
  }

  public syncWithNative(): void {
    if (!this.nativeTorrent) return;
    const t = this.nativeTorrent;

    this.task.downloadedSize = t.downloaded || 0;
    this.task.uploadedSize = t.uploaded || 0;
    this.task.totalSize = t.length || 0;
    this.task.progress = Math.round((t.progress || 0) * 1000) / 10;
    this.task.downloadSpeed = t.downloadSpeed || 0;
    this.task.uploadSpeed = t.uploadSpeed || 0;
    this.task.peers = t.numPeers || 0;
    this.task.ratio = t.ratio || 0;

    if (t.done) {
      this.task.status = 'seeding';
      if (!this.task.completedAt) {
        this.task.completedAt = new Date().toISOString();
      }
    } else if (t.paused) {
      this.task.status = 'paused';
    } else {
      this.task.status = 'downloading';
    }

    if (t.files && t.files.length > 0) {
      this.task.files = t.files.map((f: any) => ({
        name: f.name,
        path: f.path,
        length: f.length,
        downloaded: f.downloaded || 0,
        selected: f.selected !== false,
      }));
    }
  }
}
