// ============================================================================
// Anything Download Manager — Platform Utilities
// ============================================================================

import os from 'os';
import path from 'path';

export type PlatformType = 'win' | 'mac' | 'linux';

/**
 * Returns normalized platform identifier
 */
export function getPlatform(): PlatformType {
  const p = process.platform;
  if (p === 'win32') return 'win';
  if (p === 'darwin') return 'mac';
  return 'linux';
}

/**
 * Returns the default system downloads folder for the current user
 */
export function getDefaultDownloadPath(): string {
  const home = os.homedir();
  return path.join(home, 'Downloads');
}

/**
 * Returns path to application data directory
 */
export function getAppDataPath(): string {
  const home = os.homedir();
  const platform = getPlatform();

  if (platform === 'win') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'AnythingDownloadManager');
  } else if (platform === 'mac') {
    return path.join(home, 'Library', 'Application Support', 'AnythingDownloadManager');
  } else {
    return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'anything-download-manager');
  }
}

/**
 * Checks if application is running in portable mode
 */
export function isPortable(): boolean {
  return process.env.PORTABLE_EXECUTABLE_DIR !== undefined;
}
