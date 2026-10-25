// ============================================================================
// Anything Download Manager — useDownloads Hook
// ============================================================================

import { useEffect } from 'react';
import { useDownloadStore } from '../store/download-store';

export function useDownloads() {
  const {
    downloads,
    torrents,
    activeFilter,
    searchQuery,
    sortBy,
    sortOrder,
    selectedIds,
    setDownloads,
    upsertDownload,
    updateProgress,
    removeDownload,
    setTorrents,
    upsertTorrent,
    setAppVersion,
    checkForUpdates,
  } = useDownloadStore();

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getVersion().then((v) => {
      if (v) setAppVersion(v);
    });

    const updateTimer = setTimeout(() => {
      checkForUpdates();
    }, 2500);

    // Load initial tasks
    window.electronAPI.getAllDownloads().then((list) => {
      setDownloads(list);
    });

    window.electronAPI.getAllTorrents().then((list) => {
      setTorrents(list);
    });

    // Wire real-time IPC listeners
    const unbindProgress = window.electronAPI.onDownloadProgress((prog) => {
      updateProgress(prog);
    });

    const unbindAdded = window.electronAPI.onDownloadAdded((task) => {
      upsertDownload(task);
    });

    const unbindRemoved = window.electronAPI.onDownloadRemoved?.((id) => {
      removeDownload(id);
    });

    const unbindStatus = window.electronAPI.onDownloadStatusChanged((task) => {
      upsertDownload(task);
    });

    const unbindCompleted = window.electronAPI.onDownloadCompleted((task) => {
      upsertDownload(task);
    });

    const unbindError = window.electronAPI.onDownloadError(({ id, error }) => {
      const existing = downloads.find((d) => d.id === id);
      if (existing) {
        upsertDownload({ ...existing, status: 'failed', error });
      }
    });

    const unbindTorrent = window.electronAPI.onTorrentProgress((torrent) => {
      upsertTorrent(torrent);
    });

    return () => {
      clearTimeout(updateTimer);
      unbindProgress();
      unbindAdded();
      unbindRemoved?.();
      unbindStatus();
      unbindCompleted();
      unbindError();
      unbindTorrent();
    };
  }, []);

  // Filtered and sorted downloads
  const filteredDownloads = downloads.filter((d) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!d.fileName.toLowerCase().includes(q) && !d.url.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Category / status filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'downloading') return d.status === 'downloading' || d.status === 'merging';
    if (activeFilter === 'completed') return d.status === 'completed';
    if (activeFilter === 'paused') return d.status === 'paused';
    if (activeFilter === 'failed') return d.status === 'failed';
    if (activeFilter === 'torrents') return false; // Handled separately

    // Category filter
    return d.category === activeFilter;
  });

  const sortedDownloads = [...filteredDownloads].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.fileName.localeCompare(b.fileName);
    } else if (sortBy === 'size') {
      comparison = a.totalSize - b.totalSize;
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else {
      // Date
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return {
    downloads: sortedDownloads,
    totalCount: downloads.length,
    torrents,
    selectedIds,
  };
}
