// ============================================================================
// Anything Download Manager — Cross-Platform System Tray (Mac / Win / Linux)
// ============================================================================

import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { WindowManager } from './window-manager';
import { ExtensionInstaller } from './extension-installer';

let trayInstance: Tray | null = null;

// Embedded 16x16 blue lightning/arrow PNG fallback so Tray creation never fails if asset path is missing
const FALLBACK_TRAY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABMSURBVDhPYxgFo2AU0BswMjIy/mdgYPjPgAsw4dLAgAswY9OITQMDNsB48eJFFlR88eJFFnR12DSgG4BtALoB6AagG4BuAAMDAwB2ThX99H+t6wAAAABJRU5ErkJggg==';

function resolveTrayImage(): Electron.NativeImage {
  const isWin = process.platform === 'win32';
  const iconFileNames = isWin
    ? ['icon.ico', 'tray-icon.png', 'icon.png']
    : ['tray-icon.png', 'icon.png'];

  const searchDirs = [
    path.join(process.resourcesPath || '', 'assets'),
    path.join(app.getAppPath(), 'assets'),
    path.resolve(__dirname, '../../assets'),
    path.resolve(process.cwd(), 'assets'),
  ];

  for (const dir of searchDirs) {
    for (const fileName of iconFileNames) {
      const fullPath = path.join(dir, fileName);
      if (fs.existsSync(fullPath)) {
        const img = nativeImage.createFromPath(fullPath);
        if (!img.isEmpty()) {
          const size = process.platform === 'darwin' ? 18 : 16;
          return img.resize({ width: size, height: size });
        }
      }
    }
  }

  return nativeImage.createFromDataURL(`data:image/png;base64,${FALLBACK_TRAY_PNG_BASE64}`);
}

export function createTray(_mainWindow?: BrowserWindow): Tray {
  if (trayInstance) {
    return trayInstance;
  }

  const windowManager = WindowManager.getInstance();
  const icon = resolveTrayImage();

  trayInstance = new Tray(icon);
  trayInstance.setToolTip('Anything Download Manager (ADM)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Anything Download Manager',
      click: () => {
        windowManager.showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Install Browser Extension...',
      click: () => {
        windowManager.showMainWindow();
        void ExtensionInstaller.promptAndOpenExtensionFolder();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit ADM',
      click: () => {
        windowManager.setQuitting(true);
        app.quit();
      },
    },
  ]);

  trayInstance.setContextMenu(contextMenu);

  trayInstance.on('click', () => {
    if (process.platform !== 'darwin') {
      const win = windowManager.getMainWindow();
      if (win && win.isVisible() && win.isFocused()) {
        win.hide();
      } else {
        windowManager.showMainWindow();
      }
    }
  });

  trayInstance.on('double-click', () => {
    windowManager.showMainWindow();
  });

  return trayInstance;
}
