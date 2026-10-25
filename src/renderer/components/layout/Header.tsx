// ============================================================================
// Anything Download Manager — Header Toolbar
// ============================================================================

import React from 'react';
import {
  Plus,
  Share2,
  Search,
  Pause,
  Play,
  CheckCheck,
  ArrowUpDown,
} from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    toggleSortOrder,
    sortOrder,
    setIsNewDownloadOpen,
    downloads,
  } = useDownloadStore();

  const handlePauseAll = () => {
    for (const d of downloads) {
      if (d.status === 'downloading') {
        window.electronAPI?.pauseDownload(d.id);
      }
    }
  };

  const handleResumeAll = () => {
    for (const d of downloads) {
      if (d.status === 'paused' || d.status === 'queued') {
        window.electronAPI?.resumeDownload(d.id);
      }
    }
  };

  const handleClearCompleted = () => {
    window.electronAPI?.clearCompleted();
  };

  const handleAddTorrentPrompt = async () => {
    if (window.electronAPI) {
      const file = await window.electronAPI.selectFile([
        { name: 'Torrent Files', extensions: ['torrent'] },
      ]);
      if (file) {
        window.electronAPI.addTorrentFile(file);
      }
    }
  };

  return (
    <header className="h-14 border-b border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 backdrop-blur px-4 flex items-center justify-between gap-4 select-none">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Filter downloads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-100 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Sort Controls */}
        <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-950 p-1 rounded-lg border border-surface-200 dark:border-surface-800 text-xs text-surface-600 dark:text-surface-400">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs text-surface-700 dark:text-surface-300 focus:outline-none cursor-pointer px-1"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={toggleSortOrder}
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            className="p-1 hover:bg-surface-200 dark:hover:bg-surface-800 rounded transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-surface-200 dark:border-surface-800 mx-1" />

        <button
          onClick={handlePauseAll}
          title="Pause All"
          className="p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-xs font-medium transition"
        >
          <Pause className="w-4 h-4" />
        </button>

        <button
          onClick={handleResumeAll}
          title="Resume All"
          className="p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-xs font-medium transition"
        >
          <Play className="w-4 h-4" />
        </button>

        <button
          onClick={handleClearCompleted}
          title="Clear Completed"
          className="p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-xs font-medium transition"
        >
          <CheckCheck className="w-4 h-4" />
        </button>

        <button
          onClick={handleAddTorrentPrompt}
          title="Open Torrent File"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 text-xs font-medium rounded-lg transition"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Torrent</span>
        </button>

        <button
          onClick={() => setIsNewDownloadOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add URL</span>
        </button>
      </div>
    </header>
  );
};
