// ============================================================================
// Anything Download Manager — Speed Tracker (Bucketed Ring Buffer)
// ============================================================================

import { SPEED_CALC_WINDOW } from '../../shared/constants';

interface Sample {
  time: number;
  bytes: number;
}

const BUCKET_MS = 100;

export class SpeedTracker {
  private samples: Sample[] = [];
  private head = 0;
  private windowBytes = 0;
  private totalBytesDownloaded = 0;
  private startTime: number = Date.now();
  private readonly windowMs: number;

  constructor(windowMs = SPEED_CALC_WINDOW) {
    this.windowMs = windowMs;
  }

  public reset(): void {
    this.samples = [];
    this.head = 0;
    this.windowBytes = 0;
    this.totalBytesDownloaded = 0;
    this.startTime = Date.now();
  }

  public recordBytes(bytes: number): void {
    if (bytes <= 0) return;
    const now = Date.now();
    this.totalBytesDownloaded += bytes;
    this.windowBytes += bytes;

    const len = this.samples.length;
    if (len > this.head && now - this.samples[len - 1].time < BUCKET_MS) {
      this.samples[len - 1].bytes += bytes;
    } else {
      this.samples.push({ time: now, bytes });
    }

    this.cleanOldSamples(now);
  }

  public getCurrentSpeed(): number {
    const now = Date.now();
    this.cleanOldSamples(now);

    const activeCount = this.samples.length - this.head;
    if (activeCount === 0 || this.windowBytes <= 0) return 0;

    const oldest = this.samples[this.head].time;
    const durationSec = Math.max(0.1, (now - oldest) / 1000);

    return Math.round(this.windowBytes / durationSec);
  }

  public getAverageSpeed(): number {
    const durationSec = (Date.now() - this.startTime) / 1000;
    if (durationSec <= 0.1) return 0;
    return Math.round(this.totalBytesDownloaded / durationSec);
  }

  public calculateETA(remainingBytes: number): number {
    if (remainingBytes <= 0) return 0;
    const speed = this.getCurrentSpeed() || this.getAverageSpeed();
    return speed > 0 ? Math.round(remainingBytes / speed) : -1;
  }

  private cleanOldSamples(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.head < this.samples.length && this.samples[this.head].time < cutoff) {
      this.windowBytes -= this.samples[this.head].bytes;
      this.head++;
    }
    if (this.head > 64 && this.head * 2 >= this.samples.length) {
      this.samples = this.samples.slice(this.head);
      this.head = 0;
    }
  }
}
