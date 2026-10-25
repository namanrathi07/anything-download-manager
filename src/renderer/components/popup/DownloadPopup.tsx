// ============================================================================
// Anything Download Manager — IDM-Style Download Popup Window
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Download, Folder, X, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../../utils/format';
import type { NewDownloadRequest } from '../../../shared/types';

function quickExtractFileName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    for (const param of ['file', 'filename', 'name', 'title', 'attachment', 'download', 'path']) {
      const val = parsed.searchParams.get(param);
      if (val && val.includes('.') && !val.includes('/') && !val.includes('\\')) {
        return decodeURIComponent(val).trim();
      }
    }
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const clean = decodeURIComponent(last).split('?')[0].split('#')[0].trim();
      if (clean && clean.length > 0 && clean !== '/') {
        return clean;
      }
    }
  } catch {}
  return 'download';
}

export const DownloadPopup: React.FC = () => {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(-1);
  const [savePath, setSavePath] = useState('');
  const [segmentCount, setSegmentCount] = useState(8);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen for download intercepted event
    const unbind = window.electronAPI.onBrowserDownloadIntercepted((data: NewDownloadRequest) => {
      setUrl(data.url);
      const initialName = data.fileName || quickExtractFileName(data.url);
      if (initialName) setFileName(initialName);
      if (data.savePath) setSavePath(data.savePath);

      // Auto resolve authoritative file size & file name from remote headers
      window.electronAPI?.resolveUrl(data.url).then((info) => {
        if (info.fileName) setFileName(info.fileName);
        if (info.fileSize > 0) setFileSize(info.fileSize);
      }).catch(() => {});
    });

    // Also load default download path
    window.electronAPI.getSettings().then((s) => {
      if (s?.defaultSavePath) {
        setSavePath(s.defaultSavePath);
      }
    });

    return () => {
      unbind();
    };
  }, []);

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder(savePath);
      if (folder) setSavePath(folder);
    }
  };

  const handleStartNow = async () => {
    if (!url || !window.electronAPI) return;
    await window.electronAPI.addDownload({
      url,
      fileName: fileName || undefined,
      savePath: savePath || undefined,
      segmentCount,
      autoStart: true,
    });
    window.electronAPI.closePopup();
  };

  const handleDownloadLater = async () => {
    if (!url || !window.electronAPI) return;
    await window.electronAPI.addDownload({
      url,
      fileName: fileName || undefined,
      savePath: savePath || undefined,
      segmentCount,
      autoStart: false,
    });
    window.electronAPI.closePopup();
  };

  const handleCancel = () => {
    window.electronAPI?.closePopup();
  };

  return (
    <div className="h-screen w-screen bg-surface-900 text-surface-100 flex flex-col justify-between select-none p-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-surface-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary-600 text-white">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              DOWNLOAD FILE INFO
            </h3>
            <p className="text-[10px] text-surface-400">Captured from Browser</p>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="text-surface-400 hover:text-white transition p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Details */}
      <div className="space-y-3 my-2 text-xs">
        <div>
          <span className="text-surface-400 block mb-0.5 font-medium">URL</span>
          <input
            type="text"
            readOnly
            value={url}
            className="w-full bg-surface-950 border border-surface-700 rounded px-2.5 py-1.5 text-surface-300 font-mono text-[11px] truncate focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <span className="text-surface-400 block mb-0.5 font-medium">File Name</span>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-surface-950 border border-surface-700 rounded px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <span className="text-surface-400 block mb-0.5 font-medium">Size</span>
            <div className="w-full bg-surface-950 border border-surface-700 rounded px-2.5 py-1.5 text-surface-300 text-center font-mono">
              {fileSize > 0 ? formatBytes(fileSize) : 'Auto'}
            </div>
          </div>
        </div>

        <div>
          <span className="text-surface-400 block mb-0.5 font-medium">Save Folder</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              className="flex-1 bg-surface-950 border border-surface-700 rounded px-2.5 py-1.5 text-surface-300 truncate focus:outline-none"
            />
            <button
              onClick={handleSelectFolder}
              className="px-2.5 py-1.5 bg-surface-800 hover:bg-surface-700 rounded text-surface-300 transition flex items-center gap-1"
            >
              <Folder className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-surface-400 font-medium">Parallel Streams (IDM)</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="32"
              value={segmentCount}
              onChange={(e) => setSegmentCount(parseInt(e.target.value, 10))}
              className="w-24 accent-primary-500"
            />
            <span className="font-mono text-primary-400 font-bold">{segmentCount}x</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-surface-800 pt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Multi-part Verified</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs rounded font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadLater}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs rounded font-medium transition"
          >
            Download Later
          </button>
          <button
            onClick={handleStartNow}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs rounded font-semibold transition shadow-sm"
          >
            Download Now
          </button>
        </div>
      </div>
    </div>
  );
};
