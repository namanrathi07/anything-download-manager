// ============================================================================
// Anything Download Manager — Sidebar Navigation
// ============================================================================

import React from 'react';
import {
  Download,
  ArrowDownCircle,
  CheckCircle,
  PauseCircle,
  AlertCircle,
  Share2,
  Film,
  Music,
  FileText,
  Archive,
  Terminal,
  Image,
  Settings,
  Zap,
  Info,
  Bug,
} from 'lucide-react';
import { useDownloadStore, StatusFilter } from '../../store/download-store';

export const Sidebar: React.FC = () => {
  const {
    activeFilter,
    setActiveFilter,
    downloads,
    torrents,
    setIsSettingsOpen,
    setIsAboutOpen,
    setIsReportIssueOpen,
  } = useDownloadStore();

  const getCount = (filter: StatusFilter): number => {
    if (filter === 'all') return downloads.length;
    if (filter === 'downloading')
      return downloads.filter((d) => d.status === 'downloading' || d.status === 'merging').length;
    if (filter === 'completed') return downloads.filter((d) => d.status === 'completed').length;
    if (filter === 'paused') return downloads.filter((d) => d.status === 'paused').length;
    if (filter === 'failed') return downloads.filter((d) => d.status === 'failed').length;
    if (filter === 'torrents') return torrents.length;
    return downloads.filter((d) => d.category === filter).length;
  };

  const navItems: { label: string; filter: StatusFilter; icon: React.ReactNode }[] = [
    { label: 'All Downloads', filter: 'all', icon: <Download className="w-4 h-4" /> },
    { label: 'Downloading', filter: 'downloading', icon: <ArrowDownCircle className="w-4 h-4" /> },
    { label: 'Completed', filter: 'completed', icon: <CheckCircle className="w-4 h-4" /> },
    { label: 'Paused', filter: 'paused', icon: <PauseCircle className="w-4 h-4" /> },
    { label: 'Failed', filter: 'failed', icon: <AlertCircle className="w-4 h-4" /> },
    { label: 'Torrents', filter: 'torrents', icon: <Share2 className="w-4 h-4" /> },
  ];

  const categoryItems: { label: string; filter: StatusFilter; icon: React.ReactNode }[] = [
    { label: 'Videos', filter: 'video', icon: <Film className="w-4 h-4" /> },
    { label: 'Music & Audio', filter: 'audio', icon: <Music className="w-4 h-4" /> },
    { label: 'Documents', filter: 'document', icon: <FileText className="w-4 h-4" /> },
    { label: 'Compressed', filter: 'archive', icon: <Archive className="w-4 h-4" /> },
    { label: 'Programs', filter: 'program', icon: <Terminal className="w-4 h-4" /> },
    { label: 'Images', filter: 'image', icon: <Image className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-60 bg-surface-100/70 dark:bg-surface-950/70 border-r border-surface-200 dark:border-surface-800 flex flex-col justify-between select-none">
      <div className="p-4">
        {/* Branding Logo */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-surface-900 dark:text-surface-100">
              ADM
            </h1>
            <p className="text-[10px] text-surface-500 dark:text-surface-400 font-medium">
              Anything Download Manager
            </p>
          </div>
        </div>

        {/* Status Navigation */}
        <div className="space-y-0.5 mb-6">
          <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-surface-400 dark:text-surface-500">
            Status
          </div>
          {navItems.map((item) => {
            const count = getCount(item.filter);
            const active = activeFilter === item.filter;
            return (
              <button
                key={item.filter}
                onClick={() => setActiveFilter(item.filter)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200/60 dark:hover:bg-surface-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active
                        ? 'bg-primary-700 text-white'
                        : 'bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Categories Navigation */}
        <div className="space-y-0.5">
          <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-surface-400 dark:text-surface-500">
            Categories
          </div>
          {categoryItems.map((item) => {
            const count = getCount(item.filter);
            const active = activeFilter === item.filter;
            return (
              <button
                key={item.filter}
                onClick={() => setActiveFilter(item.filter)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200/60 dark:hover:bg-surface-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active
                        ? 'bg-primary-700 text-white'
                        : 'bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800 space-y-1">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-200/60 dark:hover:bg-surface-900/60 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Preferences</span>
        </button>

        <button
          onClick={() => setIsAboutOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-200/60 dark:hover:bg-surface-900/60 transition"
        >
          <Info className="w-3.5 h-3.5 text-primary-500" />
          <span>About ADM</span>
        </button>

        <button
          onClick={() => setIsReportIssueOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-surface-600 dark:text-surface-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition"
        >
          <Bug className="w-3.5 h-3.5 text-red-500" />
          <span>Report Issue</span>
        </button>
      </div>
    </aside>
  );
};
