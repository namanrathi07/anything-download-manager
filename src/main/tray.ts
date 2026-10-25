// ============================================================================
// Anything Download Manager — System Tray
// ============================================================================

import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  if (tray) return tray;

  // Resolve tray icon path
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  // Fallback if file not found
  if (icon.isEmpty()) {
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 255;
      canvas[i * 4 + 1] = 255;
      canvas[i * 4 + 2] = 255;
      canvas[i * 4 + 3] = 255;
    }
    icon = nativeImage.createFromBuffer(canvas, { width: size, height: size });
  }

  // On macOS, set template image for dark/light menu bar support
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('Anything Download Manager (ADM)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Anything Download Manager',
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Add New Download...',
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('app:show-new-download');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
