// ============================================================================
// Anything Download Manager — App Root Component
// ============================================================================

import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DownloadList } from './components/downloads/DownloadList';
import { TorrentList } from './components/torrent/TorrentList';
import { NewDownloadDialog } from './components/downloads/NewDownloadDialog';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { AboutModal } from './components/about/AboutModal';
import { ReportIssueModal } from './components/issue/ReportIssueModal';
import { useDownloads } from './hooks/useDownloads';
import { useDownloadStore } from './store/download-store';

export const App: React.FC = () => {
  const { downloads, torrents } = useDownloads();
  const { activeFilter } = useDownloadStore();

  return (
    <MainLayout>
      {activeFilter === 'torrents' ? (
        <TorrentList torrents={torrents} />
      ) : (
        <DownloadList downloads={downloads} />
      )}
      <NewDownloadDialog />
      <SettingsPanel />
      <AboutModal />
      <ReportIssueModal />
    </MainLayout>
  );
};

export default App;
