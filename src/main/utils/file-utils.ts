// ============================================================================
// Anything Download Manager — File Utilities
// ============================================================================

import fs from 'fs';
import path from 'path';
import os from 'os';
import { EXTENSION_CATEGORY_MAP } from '../../shared/constants';
import type { DownloadCategory } from '../../shared/types';

/**
 * Ensures directory exists recursively
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Returns temporary directory dedicated to ADM segments
 */
export function getTempDir(): string {
  const tempBase = path.join(os.tmpdir(), 'adm_downloads');
  ensureDir(tempBase);
  return tempBase;
}

/**
 * Extracts lowercase file extension without dot
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Automatically infers download category from filename extension
 */
export function getCategoryFromFileName(filename: string): DownloadCategory {
  const ext = getFileExtension(filename);
  const cat = EXTENSION_CATEGORY_MAP[ext];
  if (cat && isValidCategory(cat)) {
    return cat as DownloadCategory;
  }
  return 'general';
}

function isValidCategory(cat: string): boolean {
  return ['general', 'video', 'audio', 'document', 'archive', 'program', 'image', 'torrent'].includes(cat);
}

/**
 * Sanitizes filename to prevent invalid filesystem characters across Win/Mac/Linux
 */
export function sanitizeFileName(filename: string): string {
  // Replace illegal chars: / \ ? * : | " < > and control characters
  let clean = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');
  if (!clean || clean === '.' || clean === '..') {
    clean = 'download_' + Date.now();
  }
  // Trim long filenames for filesystem limits
  if (clean.length > 200) {
    const ext = path.extname(clean);
    clean = clean.slice(0, 200 - ext.length) + ext;
  }
  return clean;
}

/**
 * Returns a unique file path if target already exists by appending (1), (2), etc.
 */
export function getUniqueFilePath(targetPath: string): string {
  if (!fs.existsSync(targetPath)) return targetPath;

  const dir = path.dirname(targetPath);
  const ext = path.extname(targetPath);
  const base = path.basename(targetPath, ext);

  let counter = 1;
  let newPath = path.join(dir, `${base} (${counter})${ext}`);

  while (fs.existsSync(newPath)) {
    counter++;
    newPath = path.join(dir, `${base} (${counter})${ext}`);
  }

  return newPath;
}

/**
 * Generates unique segment temp file path
 */
export function generateTempFileName(downloadId: string, segmentIndex: number): string {
  const tempDir = getTempDir();
  return path.join(tempDir, `adm_${downloadId}_seg_${segmentIndex}.tmp`);
}

/**
 * Safely removes a file if it exists
 */
export function safeDeleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
