// ============================================================================
// Anything Download Manager — File Writer / Segment Merger
// ============================================================================

import fs from 'fs';
import path from 'path';
import { ensureDir, safeDeleteFile } from '../utils/file-utils';

export class FileWriter {
  /**
   * Merges multiple segment temporary files sequentially into the final destination path
   */
  public static async mergeSegments(
    segmentFilePaths: string[],
    destinationPath: string
  ): Promise<void> {
    ensureDir(path.dirname(destinationPath));

    // If single segment, we can simply rename or copy if cross-device
    if (segmentFilePaths.length === 1) {
      const source = segmentFilePaths[0];
      try {
        fs.renameSync(source, destinationPath);
        return;
      } catch {
        // Fallback to copy & unlink if rename fails across partitions
        await FileWriter.copyFile(source, destinationPath);
        safeDeleteFile(source);
        return;
      }
    }

    // Multiple segments: append one by one using streams
    const destStream = fs.createWriteStream(destinationPath, { flags: 'w' });

    for (const segmentPath of segmentFilePaths) {
      if (!fs.existsSync(segmentPath)) {
        destStream.end();
        throw new Error(`Segment file missing: ${segmentPath}`);
      }

      await new Promise<void>((resolve, reject) => {
        const srcStream = fs.createReadStream(segmentPath);
        srcStream.on('error', (err) => {
          destStream.end();
          reject(err);
        });
        srcStream.on('end', () => {
          resolve();
        });
        srcStream.pipe(destStream, { end: false });
      });
    }

    await new Promise<void>((resolve, reject) => {
      destStream.on('finish', () => resolve());
      destStream.on('error', (err) => reject(err));
      destStream.end();
    });

    // Cleanup all segment temporary files
    for (const segmentPath of segmentFilePaths) {
      safeDeleteFile(segmentPath);
    }
  }

  private static async copyFile(src: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const read = fs.createReadStream(src);
      const write = fs.createWriteStream(dest);
      read.on('error', reject);
      write.on('error', reject);
      write.on('finish', () => resolve());
      read.pipe(write);
    });
  }
}
