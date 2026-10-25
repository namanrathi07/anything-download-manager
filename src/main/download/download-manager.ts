// ============================================================================
// Anything Download Manager — Download Manager
// ============================================================================

import { EventEmitter } from 'events';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  DownloadTask,
  NewDownloadRequest,
  DownloadProgress,
  DownloadCategory,
} from '../../shared/types';
import { DEFAULT_MAX_CONCURRENT, DEFAULT_SEGMENT_COUNT } from '../../shared/constants';
import { DownloadTaskHandler } from './download-task';
import { UrlResolver } from './url-resolver';
import { getDefaultDownloadPath } from '../utils/platform-utils';
import {
  ensureDir,
  getCategoryFromFileName,
  getUniqueFilePath,
  safeDeleteFile,
} from '../utils/file-utils';

export class DownloadManager extends EventEmitter {
  private static instance: DownloadManager | null = null;
  private tasks = new Map<string, DownloadTaskHandler>();
  private maxConcurrent = DEFAULT_MAX_CONCURRENT;

  private constructor() {
    super();
  }

  public static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  public setMaxConcurrent(limit: number): void {
    if (limit > 0) {
      this.maxConcurrent = limit;
      this.processQueue();
    }
  }

  public getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values(), (h) => h.task);
  }

  public getTask(id: string): DownloadTask | null {
    return this.tasks.get(id)?.task ?? null;
  }

  public restoreTask(task: DownloadTask): void {
    if (this.tasks.has(task.id)) return;

    if (task.status === 'downloading' || task.status === 'merging') {
      task.status = 'paused';
    }
    task.speed = 0;

    const handler = new DownloadTaskHandler(task);
    this.attachTaskEvents(handler);
    this.tasks.set(task.id, handler);
  }

  public async addDownload(req: NewDownloadRequest): Promise<DownloadTask> {
    const id = uuidv4();
    let resolvedUrl = req.url;
    let fileName = req.fileName;
    let totalSize = -1;
    let resumable = true;
    let mimeType: string | null = null;

    try {
      const info = await UrlResolver.resolve(req.url, req.headers);
      resolvedUrl = info.url || req.url;
      if (!fileName) fileName = info.fileName;
      totalSize = info.fileSize;
      resumable = info.resumable;
      mimeType = info.mimeType;
    } catch {
      if (!fileName) {
        fileName = 'download_' + Date.now();
      }
    }

    const defaultFolder = getDefaultDownloadPath();
    const targetDir = req.savePath || defaultFolder;
    ensureDir(targetDir);

    const fullSavePath = getUniqueFilePath(path.join(targetDir, fileName!));
    const finalFileName = path.basename(fullSavePath);
    const category: DownloadCategory =
      req.category || getCategoryFromFileName(finalFileName);

    const task: DownloadTask = {
      id,
      url: resolvedUrl,
      fileName: finalFileName,
      savePath: fullSavePath,
      totalSize,
      downloadedSize: 0,
      status: 'pending',
      category,
      segments: [],
      segmentCount: req.segmentCount || DEFAULT_SEGMENT_COUNT,
      speed: 0,
      averageSpeed: 0,
      progress: 0,
      resumable,
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      headers: req.headers || {},
      mimeType,
      referrer: req.referrer || null,
    };

    const handler = new DownloadTaskHandler(task);
    this.attachTaskEvents(handler);
    this.tasks.set(id, handler);

    this.emit('task-added', handler.task);

    if (req.autoStart !== false) {
      this.startOrQueue(handler);
    }

    return handler.task;
  }

  private attachTaskEvents(handler: DownloadTaskHandler): void {
    handler.on('progress', (progress: DownloadProgress) => {
      this.emit('progress', progress);
    });

    handler.on('status-changed', (task: DownloadTask) => {
      this.emit('status-changed', task);
    });

    handler.on('completed', (task: DownloadTask) => {
      this.emit('completed', task);
      this.processQueue();
    });

    handler.on('error', (errData: { id: string; error: string }) => {
      this.emit('error', errData);
      this.processQueue();
    });
  }

  private startOrQueue(handler: DownloadTaskHandler): void {
    if (this.getActiveDownloadsCount() < this.maxConcurrent) {
      handler.start();
    } else {
      handler.task.status = 'queued';
      this.emit('status-changed', handler.task);
    }
  }

  private getActiveDownloadsCount(): number {
    let count = 0;
    for (const handler of this.tasks.values()) {
      if (handler.task.status === 'downloading' || handler.task.status === 'merging') {
        count++;
      }
    }
    return count;
  }

  private processQueue(): void {
    const activeCount = this.getActiveDownloadsCount();
    if (activeCount >= this.maxConcurrent) return;

    const availableSlots = this.maxConcurrent - activeCount;
    let scheduled = 0;

    for (const handler of this.tasks.values()) {
      if (scheduled >= availableSlots) break;
      if (handler.task.status === 'queued') {
        handler.start();
        scheduled++;
      }
    }
  }

  public pauseDownload(id: string): void {
    const handler = this.tasks.get(id);
    if (handler) {
      handler.pause();
      this.processQueue();
    }
  }

  public resumeDownload(id: string): void {
    const handler = this.tasks.get(id);
    if (handler) {
      this.startOrQueue(handler);
    }
  }

  public cancelDownload(id: string): void {
    const handler = this.tasks.get(id);
    if (handler) {
      handler.cancel();
      this.processQueue();
    }
  }

  public retryDownload(id: string): void {
    const handler = this.tasks.get(id);
    if (handler && handler.task.status === 'failed') {
      handler.task.error = null;
      this.startOrQueue(handler);
    }
  }

  public removeDownload(id: string, deleteFile = false): void {
    const handler = this.tasks.get(id);
    if (handler) {
      handler.cancel();
      if (deleteFile) {
        safeDeleteFile(handler.task.savePath);
      }
      this.tasks.delete(id);
      this.emit('task-removed', id);
      this.processQueue();
    }
  }

  public clearCompleted(): void {
    for (const [id, handler] of this.tasks.entries()) {
      if (handler.task.status === 'completed') {
        this.tasks.delete(id);
        this.emit('task-removed', id);
      }
    }
  }
}
