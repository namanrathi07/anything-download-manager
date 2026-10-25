// ============================================================================
// Anything Download Manager — Torrent Item Component
// ============================================================================

import React from 'react';
import { Play, Pause, Trash2, FolderOpen, Share2, Users, ArrowUp, ArrowDown } from 'lucide-react';
import type { TorrentTask } from '../../../shared/types';
import { DownloadProgress } from '../downloads/DownloadProgress';
import { formatBytes, formatSpeed } from '../../utils/format';

interface TorrentItemProps {
  torrent: TorrentTask;
}

export const TorrentItem: React.FC<TorrentItemProps> = ({ torrent }) => {
  const handlePause = () => {
    window.electronAPI?.pauseTorrent(torrent.id);
  };

  const handleResume = () => {
    window.electronAPI?.resumeTorrent(torrent.id);
  };

  const handleDelete = () => {
    window.electronAPI?.removeTorrent(torrent.id, false);
  };

  return (
    <div className="p-3.5 rounded-lg border bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 mb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 text-emerald-500">
            <Share2 className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate text-surface-900 dark:text-surface-100">
                {torrent.name}
              </h4>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {torrent.status}
              </span>
            </div>

            <DownloadProgress progress={torrent.progress} status={torrent.status === 'seeding' ? 'completed' : 'downloading'} showText />

            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400 mt-2 font-mono">
              <div>
                {formatBytes(torrent.downloadedSize)} of {formatBytes(torrent.totalSize)}
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-primary-500">
                  <ArrowDown className="w-3.5 h-3.5" />
                  {formatSpeed(torrent.downloadSpeed)}
                </span>
                <span className="flex items-center gap-1 text-emerald-500">
                  <ArrowUp className="w-3.5 h-3.5" />
                  {formatSpeed(torrent.uploadSpeed)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {torrent.peers} peers
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {torrent.status === 'downloading' || torrent.status === 'seeding' ? (
            <button
              onClick={handlePause}
              title="Pause Torrent"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleResume}
              title="Resume Torrent"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-emerald-500 transition"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleDelete}
            title="Remove Torrent"
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-500 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
