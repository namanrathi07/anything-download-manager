// ============================================================================
// Anything Download Manager — About Modal Component
// ============================================================================

import React from 'react';
import {
  X,
  Zap,
  Github,
  Heart,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Code2,
  Terminal,
} from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';

export const AboutModal: React.FC = () => {
  const { isAboutOpen, setIsAboutOpen } = useDownloadStore();

  if (!isAboutOpen) return null;

  const openLink = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-900 dark:text-surface-100">
                Anything Download Manager
              </h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Version 1.0.0 (Production Release)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAboutOpen(false)}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] scrollbar-thin">
          {/* Creator & Lead Developer Spotlight */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary-950/40 via-surface-900 to-surface-950 border border-primary-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
                Created & Designed By
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">Naman Rathi</h4>
              <p className="text-xs text-surface-400">
                Lead Architect & Open Source Developer
              </p>
            </div>

            <button
              onClick={() => openLink('https://github.com/namanrathi')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-white rounded-lg text-xs font-medium transition border border-surface-700 shadow-sm"
            >
              <Github className="w-4 h-4" />
              <span>@namanrathi</span>
            </button>
          </div>

          {/* How It Is Built */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2.5 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary-500" />
              How It Is Built
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-surface-50 dark:bg-surface-950/70 border border-surface-200 dark:border-surface-800 rounded-lg">
                <div className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5 mb-1">
                  <Terminal className="w-3.5 h-3.5 text-primary-500" />
                  Multi-Stream Range Engine
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                  Dynamic HTTP range request pipelining with up to 32 concurrent parallel chunk connections and zero-copy disk streaming.
                </p>
              </div>

              <div className="p-3 bg-surface-50 dark:bg-surface-950/70 border border-surface-200 dark:border-surface-800 rounded-lg">
                <div className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                  Native Electron + React 19
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                  High-speed TypeScript client running Electron 33, React 19, and Tailwind CSS for hardware-accelerated fluid performance.
                </p>
              </div>

              <div className="p-3 bg-surface-50 dark:bg-surface-950/70 border border-surface-200 dark:border-surface-800 rounded-lg">
                <div className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  SQLite + JSON Persistence
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                  Embedded ACID-compliant SQLite with automatic fallback to JSON store, keeping segments safe across reboots on all OSes.
                </p>
              </div>

              <div className="p-3 bg-surface-50 dark:bg-surface-950/70 border border-surface-200 dark:border-surface-800 rounded-lg">
                <div className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  WebTorrent P2P Client
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                  Integrated BitTorrent protocol stack for downloading torrent files and magnet links with real-time peer discovery.
                </p>
              </div>
            </div>
          </div>

          {/* Cross Platform Support Info */}
          <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 text-xs space-y-1">
            <span className="font-semibold text-surface-800 dark:text-surface-200 block">
              Universal Cross-Platform Architecture
            </span>
            <p className="text-[11px] text-surface-500 dark:text-surface-400">
              Built from scratch to run seamlessly on Windows (x64, ia32), macOS (Apple Silicon M-series & Intel Universal), and Linux (AppImage, deb, rpm).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800">
          <div className="text-[11px] text-surface-500 dark:text-surface-400">
            Released under the <span className="font-semibold text-surface-700 dark:text-surface-300">MIT License</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openLink('https://github.com/namanrathi/anything-download-manager')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:text-white bg-surface-200 dark:bg-surface-800 hover:bg-surface-700 rounded-lg transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repo</span>
            </button>

            <button
              onClick={() => openLink('https://namanrathi.github.io/anything-download-manager')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition shadow-sm"
            >
              <span>Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
