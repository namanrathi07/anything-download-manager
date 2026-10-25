// Type augmentation so the renderer can use window.electronAPI with full types
import type { ElectronAPI } from '../preload/index';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
