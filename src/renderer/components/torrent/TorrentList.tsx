// ============================================================================
// Anything Download Manager — Torrent List Component
// ============================================================================

import React from 'react';
import { Share2 } from 'lucide-react';
import type { TorrentTask } from '../../../shared/types';
import { TorrentItem } from './TorrentItem';

interface TorrentListProps {
  torrents: TorrentTask[];
}

export const TorrentList: React.FC<TorrentListProps> = ({ torrents }) => {
  if (torrents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-4">
          <Share2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-1">
          No torrents active
        </h3>
        <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-4">
          You can download torrent files or paste magnet links directly into ADM.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      {torrents.map((t) => (
        <TorrentItem key={t.id} torrent={t} />
      ))}
    </div>
  );
};
