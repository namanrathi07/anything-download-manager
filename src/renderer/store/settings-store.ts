// ============================================================================
// Anything Download Manager — Settings Store (Zustand)
// ============================================================================

import { create } from 'zustand';
import type { AppSettings } from '../../shared/types';

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,

  loadSettings: async () => {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.getSettings();
        set({ settings: loaded, loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  updateSettings: async (newSettings: Partial<AppSettings>) => {
    const current = get().settings;
    if (!current) return;
    const merged = { ...current, ...newSettings };
    set({ settings: merged });
    if (window.electronAPI) {
      await window.electronAPI.setSettings(newSettings);
    }
  },
}));
