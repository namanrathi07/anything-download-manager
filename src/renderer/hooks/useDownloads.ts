// ============================================================================
// Anything Download Manager — useDownloads Hook (Memoized + Stale-Closure Safe)
// ============================================================================

import { useEffect, useMemo } from 'react';
import { useDownloadStore } from '../store/download-store';

let listenersInitialized = false;

export function useDownloads() {
  const downloads = useDownloadStore((s) => s.downloads);
  const torrents = useDownloadStore((s) => s.torrents);
  const activeFilter = useDownloadStore((s) => s.activeFilter);
  const searchQuery = useDownloadStore((s) => s.searchQuery);
  const sortBy = useDownloadStore((s) => s.sortBy);
  const sortOrder = useDownloadStore((s) => s.sortOrder);
  const selectedIds = useDownloadStore((s) => s.selectedIds);

  useEffect(() => {
    if (!window.electronAPI || listenersInitialized) return;
    listenersInitialized = true;

    const state = useDownloadStore.getState();

    window.electronAPI.getVersion().then((v) => {
      if (v) useDownloadStore.getState().setAppVersion(v);
    });

    const updateTimer = setTimeout(() => {
      useDownloadStore.getState().checkForUpdates();
    }, 2500);

    window.electronAPI.getAllDownloads().then((list) => {
      useDownloadStore.getState().setDownloads(list);
    });

    window.electronAPI.getAllTorrents().then((list) => {
      useDownloadStore.getState().setTorrents(list);
    });

    const unbindProgress = window.electronAPI.onDownloadProgress((prog) => {
      useDownloadStore.getState().updateProgress(prog);
    });

    const unbindAdded = window.electronAPI.onDownloadAdded((task) => {
      useDownloadStore.getState().upsertDownload(task);
    });

    const unbindRemoved = window.electronAPI.onDownloadRemoved?.((id) => {
      useDownloadStore.getState().removeDownload(id);
    });

    const unbindStatus = window.electronAPI.onDownloadStatusChanged((task) => {
      useDownloadStore.getState().upsertDownload(task);
    });

    const unbindCompleted = window.electronAPI.onDownloadCompleted((task) => {
      useDownloadStore.getState().upsertDownload(task);
    });

    const unbindError = window.electronAPI.onDownloadError(({ id, error }) => {
      const current = useDownloadStore.getState().downloads.find((d) => d.id === id);
      if (current) {
        useDownloadStore.getState().upsertDownload({ ...current, status: 'failed', error });
      }
    });

    const unbindTorrent = window.electronAPI.onTorrentProgress((torrent) => {
      state.upsertTorrent(torrent);
    });

    return () => {
      listenersInitialized = false;
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

  const sortedDownloads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = downloads.filter((d) => {
      if (q && !d.fileName.toLowerCase().includes(q) && !d.url.toLowerCase().includes(q)) {
        return false;
      }
      if (activeFilter === 'all') return true;
      if (activeFilter === 'downloading') {
        return d.status === 'downloading' || d.status === 'merging';
      }
      if (activeFilter === 'completed') return d.status === 'completed';
      if (activeFilter === 'paused') return d.status === 'paused';
      if (activeFilter === 'failed') return d.status === 'failed';
      if (activeFilter === 'torrents') return false;
      return d.category === activeFilter;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.fileName.localeCompare(b.fileName);
      } else if (sortBy === 'size') {
        comparison = a.totalSize - b.totalSize;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else {
        comparison = b.createdAt.localeCompare(a.createdAt);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [downloads, activeFilter, searchQuery, sortBy, sortOrder]);

  return {
    downloads: sortedDownloads,
    totalCount: downloads.length,
    torrents,
    selectedIds,
  };
}
