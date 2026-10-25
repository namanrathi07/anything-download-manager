// ============================================================================
// Anything Download Manager — Download List Component
// ============================================================================

import React from 'react';
import { Download, Plus } from 'lucide-react';
import type { DownloadTask } from '../../../shared/types';
import { DownloadItem } from './DownloadItem';
import { useDownloadStore } from '../../store/download-store';

interface DownloadListProps {
  downloads: DownloadTask[];
}

export const DownloadList: React.FC<DownloadListProps> = ({ downloads }) => {
  const { selectedIds, toggleSelect, setIsNewDownloadOpen } = useDownloadStore();

  if (downloads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-4">
          <Download className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-surface-800 dark:text-surface-200 mb-1">
          No downloads here
        </h3>
        <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-4">
          Add a URL or enable the ADM browser extension to capture downloads automatically from any website.
        </p>
        <button
          onClick={() => setIsNewDownloadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Add URL
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      {downloads.map((task) => (
        <DownloadItem
          key={task.id}
          task={task}
          isSelected={selectedIds.has(task.id)}
          onSelect={(e) => toggleSelect(task.id, e.ctrlKey || e.metaKey)}
        />
      ))}
    </div>
  );
};
