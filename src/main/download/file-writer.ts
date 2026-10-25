// ============================================================================
// Anything Download Manager — High-Throughput File Writer / Segment Merger
// ============================================================================

import fs from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import { ensureDir, safeDeleteFile } from '../utils/file-utils';

const MERGE_HIGH_WATER_MARK = 1024 * 1024;

export class FileWriter {
  public static async mergeSegments(
    segmentFilePaths: string[],
    destinationPath: string
  ): Promise<void> {
    ensureDir(path.dirname(destinationPath));

    if (segmentFilePaths.length === 1) {
      const source = segmentFilePaths[0];
      try {
        await fs.promises.rename(source, destinationPath);
        return;
      } catch {
        await fs.promises.copyFile(source, destinationPath);
        safeDeleteFile(source);
        return;
      }
    }

    const [firstSegment, ...remainingSegments] = segmentFilePaths;
    if (!fs.existsSync(firstSegment)) {
      throw new Error(`Segment file missing: ${firstSegment}`);
    }

    try {
      await fs.promises.rename(firstSegment, destinationPath);
    } catch {
      await fs.promises.copyFile(firstSegment, destinationPath);
      safeDeleteFile(firstSegment);
    }

    const destStream = fs.createWriteStream(destinationPath, {
      flags: 'a',
      highWaterMark: MERGE_HIGH_WATER_MARK,
    });

    try {
      for (const segmentPath of remainingSegments) {
        if (!fs.existsSync(segmentPath)) {
          throw new Error(`Segment file missing: ${segmentPath}`);
        }
        const srcStream = fs.createReadStream(segmentPath, {
          highWaterMark: MERGE_HIGH_WATER_MARK,
        });
        await pipeline(srcStream, destStream, { end: false });
      }
    } finally {
      await new Promise<void>((resolve, reject) => {
        destStream.on('finish', resolve);
        destStream.on('error', reject);
        destStream.end();
      });
    }

    for (const segmentPath of remainingSegments) {
      safeDeleteFile(segmentPath);
    }
  }
}
