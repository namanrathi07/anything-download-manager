// ============================================================================
// Anything Download Manager — Report Issue Modal Component
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Bug,
  Lightbulb,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Github,
  Monitor,
} from 'lucide-react';
import { useDownloadStore } from '../../store/download-store';

export const ReportIssueModal: React.FC = () => {
  const { isReportIssueOpen, setIsReportIssueOpen } = useDownloadStore();

  const [issueType, setIssueType] = useState<'bug' | 'feature' | 'download'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [sysInfo, setSysInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isReportIssueOpen && window.electronAPI?.getSystemInfo) {
      window.electronAPI.getSystemInfo().then((info) => {
        setSysInfo(info || {});
      });
    }
  }, [isReportIssueOpen]);

  if (!isReportIssueOpen) return null;

  const buildDiagnosticText = (): string => {
    return [
      `### Environment Diagnostics`,
      `- **ADM Version**: ${sysInfo.version || '1.0.0'}`,
      `- **OS Platform**: ${sysInfo.platform || navigator.platform} (${sysInfo.arch || 'x64'})`,
      `- **OS Kernel/Release**: ${sysInfo.osRelease || 'N/A'}`,
      `- **Electron**: ${sysInfo.electron || '33.2.0'}`,
      `- **Node.js**: ${sysInfo.node || '24.x'}`,
      `- **Available Memory**: ${sysInfo.freeMemory || 'N/A'} / ${sysInfo.totalMemory || 'N/A'}`,
    ].join('\n');
  };

  const handleCopyDiagnostics = () => {
    const text = buildDiagnosticText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGitHubIssue = () => {
    const base = 'https://github.com/namanrathi07/anything-download-manager/issues/new';
    const label = issueType === 'bug' ? 'bug' : issueType === 'feature' ? 'enhancement' : 'download-issue';

    const bodyContent = [
      `## Description`,
      description.trim() || 'Describe what happened or what you would like to see...',
      '',
      buildDiagnosticText(),
    ].join('\n');

    const params = new URLSearchParams({
      title: title.trim() || `[${issueType.toUpperCase()}] `,
      labels: label,
      body: bodyContent,
    });

    const fullUrl = `${base}?${params.toString()}`;
    window.electronAPI?.openExternal(fullUrl);
    setIsReportIssueOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500 dark:bg-red-900/30">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-surface-900 dark:text-surface-100">
                Report Issue / Feedback
              </h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Directly report to GitHub or submit a feature idea
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReportIssueOpen(false)}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] scrollbar-thin">
          {/* Issue Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Type of Feedback
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIssueType('bug')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  issueType === 'bug'
                    ? 'bg-red-500/10 border-red-500 text-red-500 dark:bg-red-950/40'
                    : 'bg-surface-50 dark:bg-surface-950 border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Bug Report</span>
              </button>

              <button
                type="button"
                onClick={() => setIssueType('feature')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  issueType === 'feature'
                    ? 'bg-primary-500/10 border-primary-500 text-primary-500 dark:bg-primary-950/40'
                    : 'bg-surface-50 dark:bg-surface-950 border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Feature Idea</span>
              </button>

              <button
                type="button"
                onClick={() => setIssueType('download')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition ${
                  issueType === 'download'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-500 dark:bg-amber-950/40'
                    : 'bg-surface-50 dark:bg-surface-950 border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Download Error</span>
              </button>
            </div>
          </div>

          {/* Issue Summary */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Issue Summary
            </label>
            <input
              type="text"
              placeholder="Brief title of the problem or request..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Details & Steps to Reproduce
            </label>
            <textarea
              rows={4}
              placeholder="Tell us what URL you were downloading, what browser you used, or what happened..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Auto Diagnostics Preview */}
          <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-primary-500" />
                Auto-Collected Diagnostic Info
              </span>
              <button
                type="button"
                onClick={handleCopyDiagnostics}
                className="flex items-center gap-1 text-[11px] text-primary-500 hover:text-primary-400 font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-surface-500 dark:text-surface-400 font-mono leading-relaxed">
              ADM v{sysInfo.version || '1.0.0'} • {sysInfo.platform || 'macOS'} ({sysInfo.arch || 'x64'}) • Electron {sysInfo.electron || '33.x'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={() => setIsReportIssueOpen(false)}
            className="text-xs font-medium text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleOpenGitHubIssue}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Github className="w-4 h-4" />
            <span>Open Issue on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
