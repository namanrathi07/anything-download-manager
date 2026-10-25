// ============================================================================
// Anything Download Manager — Torrent Manager
// ============================================================================

import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { TorrentTask } from '../../shared/types';
import { TorrentTaskWrapper } from './torrent-task';
import { getDefaultDownloadPath } from '../utils/platform-utils';
import { ensureDir } from '../utils/file-utils';

export class TorrentManager extends EventEmitter {
  private static instance: TorrentManager | null = null;
  private client: any = null;
  private torrents = new Map<string, TorrentTaskWrapper>();
  private updateInterval: NodeJS.Timeout | null = null;
  private isAvailable = false;

  private constructor() {
    super();
    this.initClient();
  }

  public static getInstance(): TorrentManager {
    if (!TorrentManager.instance) {
      TorrentManager.instance = new TorrentManager();
    }
    return TorrentManager.instance;
  }

  private async initClient(): Promise<void> {
    try {
      // Dynamic import or require for webtorrent
      const WebTorrent = require('webtorrent');
      this.client = new WebTorrent({
        dht: true,
        tracker: true,
      });
      this.isAvailable = true;

      this.client.on('error', (err: any) => {
        this.emit('error', err);
      });

      this.startProgressTicker();
    } catch (err) {
      // WebTorrent might require specific polyfills or native bindings in certain environments
      console.warn('WebTorrent client initialization deferred or unavailable:', err);
      this.isAvailable = false;
    }
  }

  private startProgressTicker(): void {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => {
      for (const wrapper of this.torrents.values()) {
        if (wrapper.nativeTorrent) {
          wrapper.syncWithNative();
          this.emit('progress', wrapper.task);
        }
      }
    }, 1000);
  }

  public getAllTorrents(): TorrentTask[] {
    return Array.from(this.torrents.values()).map((w) => w.task);
  }

  public async addMagnet(magnetUri: string, customSavePath?: string): Promise<TorrentTask> {
    const id = uuidv4();
    const savePath = customSavePath || path.join(getDefaultDownloadPath(), 'Torrents');
    ensureDir(savePath);

    const task: TorrentTask = {
      id,
      name: 'Fetching metadata...',
      infoHash: '',
      magnetURI: magnetUri,
      torrentFilePath: null,
      savePath,
      totalSize: 0,
      downloadedSize: 0,
      uploadedSize: 0,
      status: 'downloading',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      peers: 0,
      seeds: 0,
      ratio: 0,
      files: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };

    const wrapper = new TorrentTaskWrapper(task);
    this.torrents.set(id, wrapper);

    if (this.client) {
      try {
        const torrent = this.client.add(magnetUri, { path: savePath }, (t: any) => {
          wrapper.nativeTorrent = t;
          wrapper.task.name = t.name;
          wrapper.task.infoHash = t.infoHash;
          wrapper.syncWithNative();
          this.emit('status-changed', wrapper.task);
        });

        torrent.on('done', () => {
          wrapper.syncWithNative();
          this.emit('completed', wrapper.task);
        });

        torrent.on('error', (err: any) => {
          wrapper.task.status = 'failed';
          wrapper.task.error = err.message;
          this.emit('error', { id, error: err.message });
        });
      } catch (err: any) {
        wrapper.task.status = 'failed';
        wrapper.task.error = err.message;
      }
    }

    this.emit('torrent-added', wrapper.task);
    return wrapper.task;
  }

  public async addTorrentFile(filePath: string, customSavePath?: string): Promise<TorrentTask> {
    const id = uuidv4();
    const savePath = customSavePath || path.join(getDefaultDownloadPath(), 'Torrents');
    ensureDir(savePath);

    const task: TorrentTask = {
      id,
      name: path.basename(filePath, '.torrent'),
      infoHash: '',
      magnetURI: null,
      torrentFilePath: filePath,
      savePath,
      totalSize: 0,
      downloadedSize: 0,
      uploadedSize: 0,
      status: 'downloading',
      progress: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      peers: 0,
      seeds: 0,
      ratio: 0,
      files: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };

    const wrapper = new TorrentTaskWrapper(task);
    this.torrents.set(id, wrapper);

    if (this.client) {
      try {
        const torrent = this.client.add(filePath, { path: savePath }, (t: any) => {
          wrapper.nativeTorrent = t;
          wrapper.task.name = t.name;
          wrapper.task.infoHash = t.infoHash;
          wrapper.syncWithNative();
          this.emit('status-changed', wrapper.task);
        });

        torrent.on('done', () => {
          wrapper.syncWithNative();
          this.emit('completed', wrapper.task);
        });

        torrent.on('error', (err: any) => {
          wrapper.task.status = 'failed';
          wrapper.task.error = err.message;
          this.emit('error', { id, error: err.message });
        });
      } catch (err: any) {
        wrapper.task.status = 'failed';
        wrapper.task.error = err.message;
      }
    }

    this.emit('torrent-added', wrapper.task);
    return wrapper.task;
  }

  public pauseTorrent(id: string): void {
    const wrapper = this.torrents.get(id);
    if (wrapper && wrapper.nativeTorrent) {
      wrapper.nativeTorrent.pause();
      wrapper.task.status = 'paused';
      this.emit('status-changed', wrapper.task);
    }
  }

  public resumeTorrent(id: string): void {
    const wrapper = this.torrents.get(id);
    if (wrapper && wrapper.nativeTorrent) {
      wrapper.nativeTorrent.resume();
      wrapper.task.status = 'downloading';
      this.emit('status-changed', wrapper.task);
    }
  }

  public removeTorrent(id: string, deleteFiles = false): void {
    const wrapper = this.torrents.get(id);
    if (wrapper) {
      if (wrapper.nativeTorrent && this.client) {
        this.client.remove(wrapper.nativeTorrent, { destroyStore: deleteFiles });
      }
      this.torrents.delete(id);
      this.emit('torrent-removed', id);
    }
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}
