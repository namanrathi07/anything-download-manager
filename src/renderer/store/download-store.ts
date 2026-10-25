// ============================================================================
// Anything Download Manager — Download Store (Zustand)
// ============================================================================

import { create } from 'zustand';
import type {
  DownloadTask,
  DownloadProgress,
  TorrentTask,
  DownloadCategory,
  UpdateCheckResult,
} from '../../shared/types';

export type StatusFilter =
  | 'all'
  | 'downloading'
  | 'completed'
  | 'paused'
  | 'failed'
  | 'torrents'
  | DownloadCategory;

interface DownloadState {
  downloads: DownloadTask[];
  torrents: TorrentTask[];
  activeFilter: StatusFilter;
  searchQuery: string;
  sortBy: 'date' | 'name' | 'size' | 'status';
  sortOrder: 'asc' | 'desc';
  selectedIds: Set<string>;
  isNewDownloadOpen: boolean;
  isSettingsOpen: boolean;
  isAboutOpen: boolean;
  isReportIssueOpen: boolean;

  appVersion: string;
  updateInfo: UpdateCheckResult | null;
  isCheckingUpdate: boolean;

  setDownloads: (downloads: DownloadTask[]) => void;
  upsertDownload: (download: DownloadTask) => void;
  updateProgress: (progress: DownloadProgress) => void;
  removeDownload: (id: string) => void;

  setTorrents: (torrents: TorrentTask[]) => void;
  upsertTorrent: (torrent: TorrentTask) => void;
  removeTorrent: (id: string) => void;

  setActiveFilter: (filter: StatusFilter) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'date' | 'name' | 'size' | 'status') => void;
  toggleSortOrder: () => void;

  toggleSelect: (id: string, multiSelect?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  setIsNewDownloadOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsAboutOpen: (open: boolean) => void;
  setIsReportIssueOpen: (open: boolean) => void;

  setAppVersion: (version: string) => void;
  setUpdateInfo: (info: UpdateCheckResult | null) => void;
  setIsCheckingUpdate: (checking: boolean) => void;
  checkForUpdates: () => Promise<UpdateCheckResult | null>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  torrents: [],
  activeFilter: 'all',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
  selectedIds: new Set<string>(),
  isNewDownloadOpen: false,
  isSettingsOpen: false,
  isAboutOpen: false,
  isReportIssueOpen: false,

  appVersion: '1.0.0',
  updateInfo: null,
  isCheckingUpdate: false,

  setDownloads: (downloads) => set({ downloads }),

  upsertDownload: (task) =>
    set((state) => {
      const idx = state.downloads.findIndex((d) => d.id === task.id);
      if (idx >= 0) {
        const next = state.downloads.slice();
        next[idx] = { ...next[idx], ...task };
        return { downloads: next };
      }
      return { downloads: [task, ...state.downloads] };
    }),

  updateProgress: (prog) =>
    set((state) => {
      const idx = state.downloads.findIndex((d) => d.id === prog.id);
      if (idx === -1) return state;

      const current = state.downloads[idx];
      if (
        current.downloadedSize === prog.downloadedSize &&
        current.speed === prog.speed &&
        current.status === prog.status
      ) {
        return state;
      }

      const next = state.downloads.slice();
      next[idx] = {
        ...current,
        downloadedSize: prog.downloadedSize,
        totalSize: prog.totalSize,
        speed: prog.speed,
        averageSpeed: prog.averageSpeed,
        progress: prog.progress,
        status: prog.status,
        segments: prog.segments
          ? prog.segments.map((seg, i) => ({
              ...(current.segments[i] || {
                id: i + 1,
                downloadId: current.id,
                startByte: 0,
                endByte: seg.totalBytes - 1,
                tempFilePath: '',
              }),
              index: seg.index,
              downloadedBytes: seg.downloadedBytes,
              speed: seg.speed,
              status: seg.status,
            }))
          : current.segments,
      };
      return { downloads: next };
    }),

  removeDownload: (id) =>
    set((state) => {
      const nextSelected = new Set(state.selectedIds);
      nextSelected.delete(id);
      return {
        downloads: state.downloads.filter((d) => d.id !== id),
        selectedIds: nextSelected,
      };
    }),

  setTorrents: (torrents) => set({ torrents }),

  upsertTorrent: (torrent) =>
    set((state) => {
      const idx = state.torrents.findIndex((t) => t.id === torrent.id);
      if (idx >= 0) {
        const next = state.torrents.slice();
        next[idx] = { ...next[idx], ...torrent };
        return { torrents: next };
      }
      return { torrents: [torrent, ...state.torrents] };
    }),

  removeTorrent: (id) =>
    set((state) => ({
      torrents: state.torrents.filter((t) => t.id !== id),
    })),

  setActiveFilter: (filter) => set({ activeFilter: filter, selectedIds: new Set() }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortOrder: () =>
    set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),

  toggleSelect: (id, multiSelect = false) =>
    set((state) => {
      const next = new Set(multiSelect ? state.selectedIds : []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.downloads.map((d) => d.id)),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setIsNewDownloadOpen: (open) => set({ isNewDownloadOpen: open }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsAboutOpen: (open) => set({ isAboutOpen: open }),
  setIsReportIssueOpen: (open) => set({ isReportIssueOpen: open }),

  setAppVersion: (version) => set({ appVersion: version }),
  setUpdateInfo: (info) => set({ updateInfo: info }),
  setIsCheckingUpdate: (checking) => set({ isCheckingUpdate: checking }),

  checkForUpdates: async () => {
    if (!window.electronAPI?.checkForUpdates) return null;
    set({ isCheckingUpdate: true });
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (result) {
        set({
          updateInfo: result,
          appVersion: result.currentVersion || get().appVersion,
        });
      }
      return result;
    } catch {
      return null;
    } finally {
      set({ isCheckingUpdate: false });
    }
  },
}));
