// ============================================================================
// Anything Download Manager — Download Progress Bar Component
// ============================================================================

import React from 'react';
import type { DownloadStatus } from '../../../shared/types';

interface DownloadProgressProps {
  progress: number;
  status: DownloadStatus;
  height?: string;
  showText?: boolean;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  progress,
  status,
  height = 'h-2',
  showText = false,
}) => {
  const clamped = Math.min(100, Math.max(0, isNaN(progress) ? 0 : progress));

  let barColor = 'bg-primary-500';
  if (status === 'completed') barColor = 'bg-emerald-500';
  else if (status === 'paused') barColor = 'bg-amber-500';
  else if (status === 'failed') barColor = 'bg-red-500';
  else if (status === 'merging') barColor = 'bg-purple-500';

  const isAnimated = status === 'downloading' || status === 'merging';

  return (
    <div className="w-full flex items-center gap-2">
      <div className={`flex-1 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden ${height}`}>
        <div
          className={`h-full transition-all duration-300 rounded-full ${barColor} ${
            isAnimated ? 'progress-bar-animated' : ''
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs font-mono font-medium text-surface-500 dark:text-surface-400 min-w-[40px] text-right">
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
};
