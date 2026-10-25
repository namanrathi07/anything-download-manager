// ============================================================================
// Anything Download Manager — Download Item Component
// ============================================================================

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FolderOpen,
  FileCheck,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Film,
  Music,
  FileText,
  Archive,
  Terminal,
  Image,
  Globe,
} from 'lucide-react';
import type { DownloadTask, DownloadCategory } from '../../../shared/types';
import { DownloadProgress } from './DownloadProgress';
import { SegmentVisualizer } from './SegmentVisualizer';
import { formatBytes, formatSpeed, formatETA } from '../../utils/format';
import { useDownloadStore } from '../../store/download-store';

interface DownloadItemProps {
  task: DownloadTask;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}

export const DownloadItem: React.FC<DownloadItemProps> = ({ task, isSelected, onSelect }) => {
  const [showSegments, setShowSegments] = useState(false);
  const { removeDownload } = useDownloadStore();

  const getCategoryIcon = (category: DownloadCategory) => {
    const props = { className: 'w-5 h-5 text-primary-400' };
    switch (category) {
      case 'video':
        return <Film {...props} />;
      case 'audio':
        return <Music {...props} />;
      case 'document':
        return <FileText {...props} />;
      case 'archive':
        return <Archive {...props} />;
      case 'program':
        return <Terminal {...props} />;
      case 'image':
        return <Image {...props} />;
      default:
        return <Globe {...props} />;
    }
  };

  const getStatusBadge = () => {
    switch (task.status) {
      case 'downloading':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-downloading">Downloading</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-completed">Completed</span>;
      case 'paused':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-paused">Paused</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-failed">Failed</span>;
      case 'merging':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-merging">Assembling</span>;
      case 'queued':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-queued">Queued</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full badge-pending">Pending</span>;
    }
  };

  const remainingBytes = task.totalSize > 0 ? task.totalSize - task.downloadedSize : -1;
  const etaSec = task.totalSize > 0 && task.speed > 0 && remainingBytes > 0 ? remainingBytes / task.speed : -1;

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.pauseDownload(task.id);
  };

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.resumeDownload(task.id);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.retryDownload(task.id);
  };

  const handleOpenFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.openFile(task.id);
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.openFolder(task.id);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeDownload(task.id);
    window.electronAPI?.cancelDownload(task.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeDownload(task.id);
    window.electronAPI?.removeDownload(task.id, false);
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none mb-2 ${
        isSelected
          ? 'bg-primary-950/20 border-primary-500/50 dark:bg-primary-900/20'
          : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
            {getCategoryIcon(task.category)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate text-surface-900 dark:text-surface-100" title={task.fileName}>
                {task.fileName}
              </h4>
              {getStatusBadge()}
            </div>

            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mb-2" title={task.url}>
              {task.url}
            </p>

            <DownloadProgress progress={task.progress} status={task.status} showText />

            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mt-2 font-mono">
              <div>
                {formatBytes(task.downloadedSize)} of {task.totalSize > 0 ? formatBytes(task.totalSize) : 'Unknown size'}
              </div>

              {task.status === 'downloading' && (
                <div className="flex items-center gap-3">
                  <span className="text-primary-500 dark:text-primary-400 font-medium">
                    {formatSpeed(task.speed)}
                  </span>
                  <span>ETA: {formatETA(etaSec)}</span>
                </div>
              )}

              {task.error && (
                <span className="text-red-500 text-xs font-sans truncate max-w-xs">{task.error}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {task.status === 'downloading' && (
            <button
              onClick={handlePause}
              title="Pause"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {(task.status === 'paused' || task.status === 'queued') && (
            <button
              onClick={handleResume}
              title="Resume"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-emerald-500 transition"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {task.status === 'failed' && (
            <button
              onClick={handleRetry}
              title="Retry"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-amber-500 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {task.status === 'completed' && (
            <button
              onClick={handleOpenFile}
              title="Open File"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-primary-500 transition"
            >
              <FileCheck className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleOpenFolder}
            title="Open Directory"
            className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {task.status !== 'completed' && (
            <button
              onClick={handleCancel}
              title="Cancel & remove download"
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-500 transition"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleDelete}
            title="Remove from list"
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {task.segments && task.segments.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSegments(!showSegments);
              }}
              title="Toggle Segment Breakdown"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 transition"
            >
              {showSegments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {showSegments && <SegmentVisualizer segments={task.segments} />}
    </div>
  );
};
