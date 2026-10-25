// ============================================================================
// Anything Download Manager — Settings Panel Component
// ============================================================================

import React from 'react';
import { X, Folder, Shield, Globe, HardDrive, Sliders, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';
import { useSettings } from '../../hooks/useSettings';

export const SettingsPanel: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    appVersion,
    updateInfo,
    isCheckingUpdate,
    checkForUpdates,
  } = useDownloadStore();
  const { settings, updateSettings } = useSettings();

  if (!isSettingsOpen || !settings) return null;

  const handleSelectPath = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder(settings.defaultSavePath);
      if (folder) {
        updateSettings({ defaultSavePath: folder });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-base text-surface-900 dark:text-surface-100">
              ADM Preferences
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* General Section */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" />
              General & Storage
            </h4>

            <div>
              <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                Default Downloads Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings.defaultSavePath}
                  className="flex-1 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                />
                <button
                  type="button"
                  onClick={handleSelectPath}
                  className="px-3 py-1.5 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-xs font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1"
                >
                  <Folder className="w-3.5 h-3.5" />
                  Browse
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray}
                  onChange={(e) => updateSettings({ minimizeToTray: e.target.checked })}
                  className="rounded border-surface-300 dark:border-surface-700 text-primary-600 focus:ring-primary-500"
                />
                Minimize to System Tray on close
              </label>

              <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => updateSettings({ showNotifications: e.target.checked })}
                  className="rounded border-surface-300 dark:border-surface-700 text-primary-600 focus:ring-primary-500"
                />
                Show system notifications
              </label>
            </div>
          </section>

          {/* Download Acceleration Section */}
          <section className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              IDM Multi-Stream Engine
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Default Parallel Segments (1 - 32)
                </label>
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={settings.defaultSegmentCount}
                  onChange={(e) =>
                    updateSettings({ defaultSegmentCount: parseInt(e.target.value, 10) || 8 })
                  }
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Max Concurrent Active Downloads
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxConcurrentDownloads}
                  onChange={(e) =>
                    updateSettings({ maxConcurrentDownloads: parseInt(e.target.value, 10) || 3 })
                  }
                  className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-900 dark:text-surface-100"
                />
              </div>
            </div>
          </section>

          {/* Browser Integration */}
          <section className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Universal Browser Integration (Chrome / Firefox / Edge / Brave)
            </h4>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.interceptDownloads}
                  onChange={(e) => updateSettings({ interceptDownloads: e.target.checked })}
                  className="rounded border-surface-300 dark:border-surface-700 text-primary-600 focus:ring-primary-500"
                />
                Automatically intercept browser downloads and display IDM popup
              </label>

              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                The ADM browser extension communicates with this app via local WebSocket on port 28370.
              </p>
            </div>
          </section>

          {/* Torrent Integration */}
          <section className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              BitTorrent / WebTorrent
            </h4>

            <div className="flex items-center gap-4 text-xs text-surface-700 dark:text-surface-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dhtEnabled}
                  onChange={(e) => updateSettings({ dhtEnabled: e.target.checked })}
                  className="rounded border-surface-300 dark:border-surface-700 text-primary-600"
                />
                Enable DHT network
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pexEnabled}
                  onChange={(e) => updateSettings({ pexEnabled: e.target.checked })}
                  className="rounded border-surface-300 dark:border-surface-700 text-primary-600"
                />
                Enable Peer Exchange (PEX)
              </label>
            </div>
          </section>

          {/* Software Updates & Version */}
          <section className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              App Version & Release Updates
            </h4>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-surface-900 dark:text-surface-100">
                    Installed Version: v{appVersion}
                  </span>
                  {updateInfo?.hasUpdate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Update v{updateInfo.latestVersion} Available
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-surface-500 dark:text-surface-400">
                  ADM checks GitHub for new production releases and updates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => checkForUpdates()}
                  disabled={isCheckingUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-xs font-medium text-surface-700 dark:text-surface-300 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-primary-400' : ''}`} />
                  <span>{isCheckingUpdate ? 'Checking...' : 'Check Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.electronAPI?.openExternal('https://github.com/namanrathi07/anything-download-manager/releases')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-primary-400 hover:underline"
                >
                  <span>Releases</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
