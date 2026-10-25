// ============================================================================
// Anything Download Manager — Speed Tracker
// ============================================================================

import { SPEED_CALC_WINDOW } from '../../shared/constants';

interface Sample {
  time: number;
  bytes: number;
}

export class SpeedTracker {
  private samples: Sample[] = [];
  private totalBytesDownloaded = 0;
  private startTime: number = Date.now();
  private windowMs: number;

  constructor(windowMs = SPEED_CALC_WINDOW) {
    this.windowMs = windowMs;
  }

  /**
   * Reset tracking state
   */
  public reset(): void {
    this.samples = [];
    this.totalBytesDownloaded = 0;
    this.startTime = Date.now();
  }

  /**
   * Record new chunk of bytes received
   */
  public recordBytes(bytes: number): void {
    if (bytes <= 0) return;
    const now = Date.now();
    this.totalBytesDownloaded += bytes;
    this.samples.push({ time: now, bytes });
    this.cleanOldSamples(now);
  }

  /**
   * Current instantaneous speed (bytes per second over the sliding window)
   */
  public getCurrentSpeed(): number {
    const now = Date.now();
    this.cleanOldSamples(now);

    if (this.samples.length < 2) return 0;

    let windowBytes = 0;
    for (const s of this.samples) {
      windowBytes += s.bytes;
    }

    const oldest = this.samples[0].time;
    const durationSec = (now - oldest) / 1000;
    if (durationSec <= 0) return 0;

    return Math.round(windowBytes / durationSec);
  }

  /**
   * Overall average speed since start (bytes per second)
   */
  public getAverageSpeed(): number {
    const durationSec = (Date.now() - this.startTime) / 1000;
    if (durationSec <= 0) return 0;
    return Math.round(this.totalBytesDownloaded / durationSec);
  }

  /**
   * Estimates time remaining in seconds given total size and current downloaded size
   */
  public calculateETA(remainingBytes: number): number {
    if (remainingBytes <= 0) return 0;
    const currentSpeed = this.getCurrentSpeed();
    const speed = currentSpeed > 0 ? currentSpeed : this.getAverageSpeed();
    if (speed <= 0) return -1;
    return Math.round(remainingBytes / speed);
  }

  private cleanOldSamples(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.samples.length > 0 && this.samples[0].time < cutoff) {
      this.samples.shift();
    }
  }
}
