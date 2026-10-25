// ============================================================================
// Anything Download Manager — New Download Dialog
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Folder, Loader2, Sparkles } from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';
import { formatBytes } from '../../utils/format';
import type { UrlInfo } from '../../../shared/types';

export const NewDownloadDialog: React.FC = () => {
  const { isNewDownloadOpen, setIsNewDownloadOpen } = useDownloadStore();

  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [savePath, setSavePath] = useState('');
  const [segmentCount, setSegmentCount] = useState(8);
  const [autoStart, setAutoStart] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [urlInfo, setUrlInfo] = useState<UrlInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNewDownloadOpen) {
      setError(null);
      setUrlInfo(null);
      // Auto-populate clipboard if valid URL
      navigator.clipboard?.readText().then((text) => {
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          setUrl(text);
          resolveUrl(text);
        }
      }).catch(() => {});
    }
  }, [isNewDownloadOpen]);

  const resolveUrl = async (targetUrl: string) => {
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return;
    }
    setResolving(true);
    setError(null);
    try {
      if (window.electronAPI) {
        const info = await window.electronAPI.resolveUrl(targetUrl);
        setUrlInfo(info);
        if (info.fileName) setFileName(info.fileName);
      }
    } catch (err: any) {
      setError(err.message || 'Could not resolve remote URL details');
    } finally {
      setResolving(false);
    }
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder(savePath);
      if (folder) setSavePath(folder);
    }
  };

  const handleStartDownload = async () => {
    if (!url.trim()) return;

    try {
      if (window.electronAPI) {
        await window.electronAPI.addDownload({
          url: url.trim(),
          fileName: fileName.trim() || undefined,
          savePath: savePath.trim() || undefined,
          segmentCount,
          autoStart,
        });
      }
      setIsNewDownloadOpen(false);
      setUrl('');
      setFileName('');
    } catch (err: any) {
      setError(err.message || 'Failed to start download');
    }
  };

  if (!isNewDownloadOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-base text-surface-900 dark:text-surface-100">
              New Download
            </h3>
          </div>
          <button
            onClick={() => setIsNewDownloadOpen(false)}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Download URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/file.zip"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => resolveUrl(url)}
                className="flex-1 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => resolveUrl(url)}
                disabled={resolving || !url}
                className="px-3 py-2 bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {resolving && <Loader2 className="w-4 h-4 animate-spin" />}
                Inspect
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* URL Info Badge */}
          {urlInfo && (
            <div className="p-3 bg-surface-100 dark:bg-surface-950 rounded-lg border border-surface-200 dark:border-surface-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-surface-500 dark:text-surface-400">File Size: </span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">
                  {urlInfo.fileSize > 0 ? formatBytes(urlInfo.fileSize) : 'Unknown (Stream)'}
                </span>
              </div>
              <div>
                <span className="text-surface-500 dark:text-surface-400">Multi-Stream Range: </span>
                <span
                  className={`font-semibold ${
                    urlInfo.resumable ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {urlInfo.resumable ? 'Supported (Accelerated)' : 'Single stream only'}
                </span>
              </div>
            </div>
          )}

          {/* File Name */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Save As File Name
            </label>
            <input
              type="text"
              placeholder="filename.ext"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Save Directory */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Save Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Default download folder"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                className="flex-1 bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
              >
                <Folder className="w-4 h-4" />
                Browse
              </button>
            </div>
          </div>

          {/* Segments Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider">
                Parallel Connections (IDM Acceleration)
              </label>
              <span className="text-xs font-mono font-bold text-primary-500">
                {segmentCount} Segments
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="32"
              value={segmentCount}
              onChange={(e) => setSegmentCount(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>

          {/* Auto Start Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoStartCheck"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="rounded border-surface-300 dark:border-surface-700 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="autoStartCheck" className="text-sm text-surface-700 dark:text-surface-300 select-none">
              Start download immediately
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={() => setIsNewDownloadOpen(false)}
            className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartDownload}
            disabled={!url.trim()}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            Start Download
          </button>
        </div>
      </div>
    </div>
  );
};
