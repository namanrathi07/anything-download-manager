// ============================================================================
// Anything Download Manager — About Modal Component
// ============================================================================

import React, { useState } from 'react';
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
  RefreshCw,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';

export const AboutModal: React.FC = () => {
  const {
    isAboutOpen,
    setIsAboutOpen,
    appVersion,
    updateInfo,
    isCheckingUpdate,
    checkForUpdates,
  } = useDownloadStore();

  const [hasCheckedManually, setHasCheckedManually] = useState(false);

  if (!isAboutOpen) return null;

  const openLink = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  const handleCheckUpdate = async () => {
    setHasCheckedManually(true);
    await checkForUpdates();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-primary-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-primary-500/25 p-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                <path d="M20 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                <path d="M5 19H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-900 dark:text-surface-100 flex items-center gap-2">
                Anything Download Manager
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  v{appVersion}
                </span>
              </h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Official Production Release • Cross-Platform Engine
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
          {/* Release & Update Status Card */}
          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-950/80 border border-surface-200 dark:border-surface-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
                  Release Version Status
                </span>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin text-primary-400' : ''}`} />
                <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            </div>

            {updateInfo?.hasUpdate ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>New Version Available: <strong>{updateInfo.latestVersion}</strong></span>
                  </div>
                  <span className="text-[10px] text-surface-400">
                    Current: v{appVersion}
                  </span>
                </div>
                {updateInfo.releaseName && (
                  <p className="text-[11px] text-surface-300 font-medium">
                    {updateInfo.releaseName}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {updateInfo.downloadUrl && (
                    <button
                      onClick={() => openLink(updateInfo.downloadUrl!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {updateInfo.latestVersion}</span>
                    </button>
                  )}
                  <button
                    onClick={() => openLink(updateInfo.releaseUrl)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white text-xs font-medium transition border border-surface-700"
                  >
                    <span>Release Notes</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : hasCheckedManually && updateInfo ? (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>You are on the latest version (v{appVersion}). No new updates available.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
                <span>Installed Version: <strong>v{appVersion}</strong></span>
                <button
                  onClick={() => openLink('https://github.com/namanrathi07/anything-download-manager/releases')}
                  className="text-primary-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>All Versions History</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

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
              onClick={() => openLink('https://github.com/namanrathi07')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-white rounded-lg text-xs font-medium transition border border-surface-700 shadow-sm"
            >
              <Github className="w-4 h-4" />
              <span>@namanrathi07</span>
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
                  Zero-Native Resilient Store
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                  Pure atomic JSON persistence engine eliminating any missing .dll or MSVC runtime requirements on all OSs.
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
              Built from scratch to run seamlessly on Windows (x64), macOS (Apple Silicon M-series & Intel Universal), and Linux (AppImage & deb).
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
              onClick={() => openLink('https://github.com/namanrathi07/anything-download-manager')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:text-white bg-surface-200 dark:bg-surface-800 hover:bg-surface-700 rounded-lg transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub Repo</span>
            </button>

            <button
              onClick={() => openLink('https://namanrathi07.github.io/anything-download-manager')}
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
