// ============================================================================
// Anything Download Manager — Format Utilities
// ============================================================================

/**
 * Format bytes into human-readable string (e.g., "1.5 MB", "2.34 GB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Format speed in bytes per second into string (e.g., "3.2 MB/s")
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0 || isNaN(bytesPerSecond)) return '0 B/s';
  return `${formatBytes(bytesPerSecond, 1)}/s`;
}

/**
 * Format ETA in seconds into human-readable duration (e.g., "1h 24m 30s", "45s")
 */
export function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0 || isNaN(seconds)) return '--';
  if (seconds === 0) return '0s';

  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor((seconds / 3600) % 24);
  const d = Math.floor(seconds / 86400);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format progress percentage (e.g., "45.2%")
 */
export function formatProgress(progress: number): string {
  if (isNaN(progress) || progress < 0) return '0%';
  if (progress >= 100) return '100%';
  return `${progress.toFixed(1)}%`;
}
