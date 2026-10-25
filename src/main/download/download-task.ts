// ============================================================================
// Anything Download Manager — Download Task Handler
// ============================================================================

import { EventEmitter } from 'events';
import type {
  DownloadTask,
  DownloadStatus,
  DownloadProgress,
} from '../../shared/types';
import { Segment } from './segment';
import { FileWriter } from './file-writer';
import { SpeedTracker } from './speed-tracker';
import { generateTempFileName, safeDeleteFile } from '../utils/file-utils';
import { DEFAULT_SEGMENT_COUNT, MIN_SEGMENT_SIZE } from '../../shared/constants';

const PROGRESS_TICK_MS = 250;

export class DownloadTaskHandler extends EventEmitter {
  public task: DownloadTask;
  private segmentHandlers: Segment[] = [];
  private speedTracker: SpeedTracker;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor(task: DownloadTask) {
    super();
    this.task = { ...task };
    this.speedTracker = new SpeedTracker();
    this.initSegments();
  }

  private initSegments(): void {
    if (this.task.segments && this.task.segments.length > 0) {
      this.segmentHandlers = this.task.segments.map((seg) => {
        const handler = new Segment({
          id: seg.id,
          downloadId: this.task.id,
          index: seg.index,
          startByte: seg.startByte,
          endByte: seg.endByte,
          downloadedBytes: seg.downloadedBytes,
          tempFilePath: seg.tempFilePath,
          url: this.task.url,
          headers: this.task.headers,
        });
        this.attachSegmentListeners(handler);
        return handler;
      });
      return;
    }

    const size = this.task.totalSize;
    let count = this.task.segmentCount || DEFAULT_SEGMENT_COUNT;

    if (!this.task.resumable || size <= 0 || size < MIN_SEGMENT_SIZE) {
      count = 1;
    }

    this.task.segmentCount = count;
    this.segmentHandlers = [];
    const createdSegments = [];

    if (count === 1) {
      const tempPath = generateTempFileName(this.task.id, 0);
      const segHandler = new Segment({
        id: 1,
        downloadId: this.task.id,
        index: 0,
        startByte: 0,
        endByte: size > 0 ? size - 1 : -1,
        tempFilePath: tempPath,
        url: this.task.url,
        headers: this.task.headers,
      });
      this.attachSegmentListeners(segHandler);
      this.segmentHandlers.push(segHandler);
      createdSegments.push(segHandler.toJSON());
    } else {
      const partSize = Math.floor(size / count);
      for (let i = 0; i < count; i++) {
        const start = i * partSize;
        const end = i === count - 1 ? size - 1 : (i + 1) * partSize - 1;
        const tempPath = generateTempFileName(this.task.id, i);

        const segHandler = new Segment({
          id: i + 1,
          downloadId: this.task.id,
          index: i,
          startByte: start,
          endByte: end,
          tempFilePath: tempPath,
          url: this.task.url,
          headers: this.task.headers,
        });

        this.attachSegmentListeners(segHandler);
        this.segmentHandlers.push(segHandler);
        createdSegments.push(segHandler.toJSON());
      }
    }

    this.task.segments = createdSegments;
  }

  private attachSegmentListeners(seg: Segment): void {
    seg.on('bytes', (bytes: number) => {
      this.speedTracker.recordBytes(bytes);
    });

    seg.on('completed', () => {
      this.checkAllSegmentsCompleted();
    });

    seg.on('size-discovered', (discoveredSize: number) => {
      if (this.task.totalSize <= 0 && discoveredSize > 0) {
        this.task.totalSize = discoveredSize;
        this.task.resumable = true;
        this.updateAggregatedProgress();
        this.emit('status-changed', this.task);
      }
    });

    seg.on('error', (err) => {
      this.clearTicker();
      for (const s of this.segmentHandlers) {
        if (s !== seg && s.status === 'downloading') s.pause();
      }
      this.setStatus('failed', err.message);
      this.emit('error', { id: this.task.id, error: err.message });
    });
  }

  public start(): void {
    if (this.task.status === 'downloading' || this.task.status === 'completed') {
      return;
    }

    this.setStatus('downloading');
    this.speedTracker.reset();

    this.clearTicker();
    this.progressInterval = setInterval(() => {
      this.broadcastProgress();
    }, PROGRESS_TICK_MS);

    for (const seg of this.segmentHandlers) {
      seg.start();
    }
  }

  public pause(): void {
    if (this.task.status !== 'downloading') return;

    this.clearTicker();
    for (const seg of this.segmentHandlers) {
      seg.pause();
    }
    this.updateAggregatedProgress();
    this.task.speed = 0;
    this.setStatus('paused');
  }

  public resume(): void {
    if (this.task.status !== 'paused' && this.task.status !== 'failed') return;
    this.start();
  }

  public cancel(): void {
    this.clearTicker();
    for (const seg of this.segmentHandlers) {
      seg.cancel();
      safeDeleteFile(seg.tempFilePath);
    }
    this.task.speed = 0;
    this.setStatus('failed', 'Download cancelled by user');
  }

  private clearTicker(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private setStatus(status: DownloadStatus, errorMsg?: string): void {
    this.task.status = status;
    if (errorMsg) {
      this.task.error = errorMsg;
    }
    this.task.segments = this.segmentHandlers.map((s) => s.toJSON());
    this.emit('status-changed', this.task);
  }

  private updateAggregatedProgress(): void {
    let totalDownloaded = 0;
    for (const seg of this.segmentHandlers) {
      totalDownloaded += seg.downloadedBytes;
    }

    this.task.downloadedSize = totalDownloaded;
    this.task.speed = this.speedTracker.getCurrentSpeed();
    this.task.averageSpeed = this.speedTracker.getAverageSpeed();

    if (this.task.totalSize > 0) {
      const prog = (totalDownloaded / this.task.totalSize) * 100;
      this.task.progress = Math.min(100, Math.round(prog * 10) / 10);
    } else {
      this.task.progress = 0;
    }
  }

  private broadcastProgress(): void {
    this.updateAggregatedProgress();
    this.task.segments = this.segmentHandlers.map((s) => s.toJSON());

    const progressObj: DownloadProgress = {
      id: this.task.id,
      downloadedSize: this.task.downloadedSize,
      totalSize: this.task.totalSize,
      speed: this.task.speed,
      averageSpeed: this.task.averageSpeed,
      progress: this.task.progress,
      status: this.task.status,
      segments: this.segmentHandlers.map((s) => ({
        index: s.index,
        downloadedBytes: s.downloadedBytes,
        totalBytes: s.getTotalBytes(),
        speed: s.getSpeed(),
        status: s.status,
      })),
    };

    this.emit('progress', progressObj);
  }

  private async checkAllSegmentsCompleted(): Promise<void> {
    if (this.task.status === 'merging' || this.task.status === 'completed') return;
    const allDone = this.segmentHandlers.every((s) => s.status === 'completed');
    if (!allDone) return;

    this.clearTicker();
    this.setStatus('merging');

    try {
      const tempPaths = this.segmentHandlers.map((s) => s.tempFilePath);
      await FileWriter.mergeSegments(tempPaths, this.task.savePath);

      this.task.downloadedSize =
        this.task.totalSize > 0 ? this.task.totalSize : this.task.downloadedSize;
      this.task.progress = 100;
      this.task.speed = 0;
      this.task.completedAt = new Date().toISOString();
      this.setStatus('completed');
      this.emit('completed', this.task);
    } catch (err: any) {
      this.setStatus('failed', `Failed to merge segments: ${err.message}`);
      this.emit('error', { id: this.task.id, error: err.message });
    }
  }
}
