// ============================================================================
// Anything Download Manager — Segment Visualizer (IDM Style)
// ============================================================================

import React from 'react';
import type { DownloadSegment } from '../../../shared/types';
import { formatBytes } from '../../utils/format';

interface SegmentVisualizerProps {
  segments?: DownloadSegment[];
}

export const SegmentVisualizer: React.FC<SegmentVisualizerProps> = ({ segments }) => {
  if (!segments || segments.length <= 1) return null;

  return (
    <div className="mt-2 p-2 bg-surface-100 dark:bg-surface-900/60 rounded-md border border-surface-200 dark:border-surface-800/80">
      <div className="text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1.5 flex justify-between">
        <span>Parallel Segments ({segments.length} connections)</span>
        <span>IDM Multi-stream Mode</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {segments.map((seg) => {
          const total = seg.endByte - seg.startByte + 1;
          const pct = total > 0 ? Math.min(100, (seg.downloadedBytes / total) * 100) : 0;

          let segColor = 'bg-surface-300 dark:bg-surface-700';
          if (seg.status === 'completed') segColor = 'bg-emerald-500';
          else if (seg.status === 'downloading') segColor = 'bg-primary-500';
          else if (seg.status === 'paused') segColor = 'bg-amber-500';
          else if (seg.status === 'failed') segColor = 'bg-red-500';

          return (
            <div
              key={seg.index}
              title={`Segment #${seg.index + 1}: ${pct.toFixed(1)}% (${formatBytes(seg.downloadedBytes)} / ${formatBytes(total)})`}
              className="group relative bg-surface-200 dark:bg-surface-800 h-2.5 rounded overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-200 ${segColor} ${
                  seg.status === 'downloading' ? 'progress-bar-animated' : ''
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
