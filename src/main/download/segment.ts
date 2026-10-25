// ============================================================================
// Anything Download Manager — Download Segment
// ============================================================================

import { EventEmitter } from 'events';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { DownloadSegment, SegmentStatus } from '../../shared/types';
import { SpeedTracker } from './speed-tracker';

export interface SegmentOptions {
  id: number;
  downloadId: string;
  index: number;
  startByte: number;
  endByte: number; // inclusive, or -1 for single stream till end
  downloadedBytes?: number;
  tempFilePath: string;
  url: string;
  headers?: Record<string, string>;
}

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

    // Check if segment is already complete
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
    return this.speedTracker.getCurrentSpeed();
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

  /**
   * Start or resume segment downloading
   */
  public start(): void {
    if (this.status === 'downloading' || this.status === 'completed') {
      return;
    }

    const totalExpected = this.getTotalBytes();
    if (totalExpected > 0 && this.downloadedBytes >= totalExpected) {
      this.status = 'completed';
      this.emit('completed', this);
      return;
    }

    this.status = 'downloading';
    this.speedTracker.reset();

    const currentOffset = this.startByte + this.downloadedBytes;
    const parsed = new URL(this.url);
    const client = parsed.protocol === 'https:' ? https : http;

    const requestHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ADM/1.0',
      'Accept': '*/*',
      ...this.headers,
    };

    // Only add Range header if endByte >= 0 or resuming
    if (this.endByte >= 0) {
      requestHeaders['Range'] = `bytes=${currentOffset}-${this.endByte}`;
    } else if (this.downloadedBytes > 0) {
      requestHeaders['Range'] = `bytes=${currentOffset}-`;
    }

    // Open write stream in append mode if resuming, or write mode if start
    const flags = this.downloadedBytes > 0 ? 'a' : 'w';
    this.writeStream = fs.createWriteStream(this.tempFilePath, { flags });

    this.writeStream.on('error', (err) => {
      this.handleError(err);
    });

    const options: http.RequestOptions = {
      method: 'GET',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      headers: requestHeaders,
    };

    this.activeRequest = client.request(options, (res) => {
      // Check for valid response code (200 OK or 206 Partial Content)
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        this.handleError(
          new Error(`Segment ${this.index} failed with HTTP status ${res.statusCode}`)
        );
        return;
      }

      // Automatically discover and notify total file size from response headers
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

      res.on('data', (chunk: Buffer) => {
        if (this.status !== 'downloading') return;

        this.downloadedBytes += chunk.length;
        this.speedTracker.recordBytes(chunk.length);

        if (this.writeStream && !this.writeStream.destroyed) {
          this.writeStream.write(chunk);
        }

        this.emit('progress', {
          index: this.index,
          downloadedBytes: this.downloadedBytes,
          speed: this.getSpeed(),
        });

        // Check if finished by byte count
        if (totalExpected > 0 && this.downloadedBytes >= totalExpected) {
          this.finish();
        }
      });

      res.on('end', () => {
        if (this.status === 'downloading') {
          this.finish();
        }
      });

      res.on('error', (err) => {
        this.handleError(err);
      });
    });

    this.activeRequest.on('error', (err) => {
      this.handleError(err);
    });

    this.activeRequest.end();
  }

  /**
   * Pause segment download
   */
  public pause(): void {
    if (this.status !== 'downloading') return;
    this.status = 'paused';
    this.cleanupStreams();
    this.emit('paused', this);
  }

  /**
   * Cancel and cleanup
   */
  public cancel(): void {
    this.status = 'failed';
    this.cleanupStreams();
  }

  private finish(): void {
    this.status = 'completed';
    this.cleanupStreams();
    this.emit('completed', this);
  }

  private handleError(err: Error): void {
    this.cleanupStreams();

    if (this.status === 'paused') {
      return;
    }

    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      setTimeout(() => {
        if (this.status !== 'paused' && this.status !== 'completed') {
          this.start();
        }
      }, 1000 * this.retryAttempts);
    } else {
      this.status = 'failed';
      this.emit('error', err);
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
