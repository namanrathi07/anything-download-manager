// ============================================================================
// Anything Download Manager — useSettings Hook
// ============================================================================

import { useEffect } from 'react';
import { useSettingsStore } from '../store/settings-store';

export function useSettings() {
  const { settings, loading, loadSettings, updateSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, updateSettings };
}
