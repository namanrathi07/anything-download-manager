// ============================================================================
// Anything Download Manager — Download Segment (Buffered I/O + Keep-Alive)
// ============================================================================

import { EventEmitter } from 'events';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { DownloadSegment, SegmentStatus } from '../../shared/types';
import { SpeedTracker } from './speed-tracker';
import { sharedHttpAgent, sharedHttpsAgent } from './url-resolver';

export interface SegmentOptions {
  id: number;
  downloadId: string;
  index: number;
  startByte: number;
  endByte: number;
  downloadedBytes?: number;
  tempFilePath: string;
  url: string;
  headers?: Record<string, string>;
}

const STREAM_HIGH_WATER_MARK = 256 * 1024;
const MAX_REDIRECTS = 5;

export class Segment extends EventEmitter {
  public readonly id: number;
  public readonly downloadId: string;
  public readonly index: number;
  public readonly startByte: number;
  public endByte: number;
  public downloadedBytes = 0;
  public status: SegmentStatus = 'pending';
  public readonly tempFilePath: string;

  private url: string;
  private headers: Record<string, string>;
  private activeRequest: http.ClientRequest | null = null;
  private writeStream: fs.WriteStream | null = null;
  private speedTracker: SpeedTracker;
  private retryAttempts = 0;
  private maxRetries = 3;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(options: SegmentOptions) {
    super();
    this.id = options.id;
    this.downloadId = options.downloadId;
    this.index = options.index;
    this.startByte = options.startByte;
    this.endByte = options.endByte;
    this.downloadedBytes = options.downloadedBytes || 0;
    this.tempFilePath = options.tempFilePath;
    this.url = options.url;
    this.headers = options.headers || {};
    this.speedTracker = new SpeedTracker();

    const totalExpected = this.getTotalBytes();
    if (totalExpected > 0 && this.downloadedBytes >= totalExpected) {
      this.status = 'completed';
    }
  }

  public getTotalBytes(): number {
    if (this.endByte < 0) return -1;
    return this.endByte - this.startByte + 1;
  }

  public getSpeed(): number {
    return this.status === 'downloading' ? this.speedTracker.getCurrentSpeed() : 0;
  }

  public toJSON(): DownloadSegment {
    return {
      id: this.id,
      downloadId: this.downloadId,
      index: this.index,
      startByte: this.startByte,
      endByte: this.endByte,
      downloadedBytes: this.downloadedBytes,
      status: this.status,
      speed: this.getSpeed(),
      tempFilePath: this.tempFilePath,
    };
  }

  public start(redirectCount = 0): void {
    if (this.status === 'downloading' && redirectCount === 0) return;
    if (this.status === 'completed') return;

    const totalExpected = this.getTotalBytes();
    if (totalExpected > 0 && this.downloadedBytes >= totalExpected) {
      this.status = 'completed';
      this.emit('completed', this);
      return;
    }

    this.status = 'downloading';
    if (redirectCount === 0) {
      this.speedTracker.reset();
    }

    const currentOffset = this.startByte + this.downloadedBytes;
    const parsed = new URL(this.url);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ADM/1.0',
      Accept: '*/*',
      ...this.headers,
    };

    if (this.endByte >= 0) {
      requestHeaders['Range'] = `bytes=${currentOffset}-${this.endByte}`;
    } else if (this.downloadedBytes > 0) {
      requestHeaders['Range'] = `bytes=${currentOffset}-`;
    }

    if (!this.writeStream || this.writeStream.destroyed) {
      const flags = this.downloadedBytes > 0 ? 'a' : 'w';
      this.writeStream = fs.createWriteStream(this.tempFilePath, {
        flags,
        highWaterMark: STREAM_HIGH_WATER_MARK,
      });
      this.writeStream.on('error', (err) => this.handleError(err));
    }

    this.activeRequest = client.request(
      {
        method: 'GET',
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: requestHeaders,
        agent: isHttps ? sharedHttpsAgent : sharedHttpAgent,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.destroy();
          if (redirectCount >= MAX_REDIRECTS) {
            this.handleError(new Error(`Segment ${this.index} exceeded max redirects`));
            return;
          }
          this.url = new URL(res.headers.location, this.url).toString();
          this.start(redirectCount + 1);
          return;
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          res.destroy();
          this.handleError(
            new Error(`Segment ${this.index} failed with HTTP status ${res.statusCode}`)
          );
          return;
        }

        if (this.endByte < 0) {
          let discoveredTotal = -1;
          if (res.statusCode === 206 && res.headers['content-range']) {
            const match = String(res.headers['content-range']).match(/\/(\d+|\*)/);
            if (match && match[1] && match[1] !== '*') {
              discoveredTotal = parseInt(match[1], 10);
            }
          } else if (res.headers['content-length']) {
            const len = parseInt(String(res.headers['content-length']), 10);
            if (!isNaN(len) && len > 0) {
              discoveredTotal = this.downloadedBytes + len;
            }
          }

          if (discoveredTotal > 0) {
            this.endByte = discoveredTotal - 1;
            this.emit('size-discovered', discoveredTotal);
          }
        }

        const expectedBytes = this.getTotalBytes();

        res.on('data', (chunk: Buffer) => {
          if (this.status !== 'downloading') return;

          let bytesToWrite = chunk;
          if (expectedBytes > 0 && this.downloadedBytes + chunk.length > expectedBytes) {
            const remaining = expectedBytes - this.downloadedBytes;
            bytesToWrite = chunk.subarray(0, remaining);
          }

          this.downloadedBytes += bytesToWrite.length;
          this.speedTracker.recordBytes(bytesToWrite.length);
          this.emit('bytes', bytesToWrite.length);

          if (this.writeStream && !this.writeStream.destroyed) {
            const canContinue = this.writeStream.write(bytesToWrite);
            if (!canContinue) {
              res.pause();
              this.writeStream.once('drain', () => {
                if (this.status === 'downloading') res.resume();
              });
            }
          }

          if (expectedBytes > 0 && this.downloadedBytes >= expectedBytes) {
            this.finish();
          }
        });

        res.on('end', () => {
          if (this.status === 'downloading') {
            this.finish();
          }
        });

        res.on('error', (err) => this.handleError(err));
      }
    );

    this.activeRequest.on('socket', (socket) => {
      socket.setNoDelay(true);
    });

    this.activeRequest.on('error', (err) => this.handleError(err));
    this.activeRequest.end();
  }

  public pause(): void {
    if (this.status !== 'downloading') return;
    this.status = 'paused';
    this.clearRetryTimer();
    this.cleanupStreams();
    this.emit('paused', this);
  }

  public cancel(): void {
    this.status = 'failed';
    this.clearRetryTimer();
    this.cleanupStreams();
  }

  private finish(): void {
    if (this.status === 'completed') return;
    this.status = 'completed';

    if (this.activeRequest) {
      this.activeRequest.destroy();
      this.activeRequest = null;
    }

    if (this.writeStream) {
      const ws = this.writeStream;
      this.writeStream = null;
      ws.end(() => {
        this.emit('completed', this);
      });
    } else {
      this.emit('completed', this);
    }
  }

  private handleError(err: Error): void {
    this.cleanupStreams();
    if (this.status === 'paused' || this.status === 'completed') return;

    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      this.retryTimer = setTimeout(() => {
        if (this.status !== 'paused' && this.status !== 'completed') {
          this.status = 'pending';
          this.start();
        }
      }, 1000 * this.retryAttempts);
    } else {
      this.status = 'failed';
      this.emit('error', err);
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private cleanupStreams(): void {
    if (this.activeRequest) {
      this.activeRequest.destroy();
      this.activeRequest = null;
    }
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}
