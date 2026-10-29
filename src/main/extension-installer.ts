// ============================================================================
// Anything Download Manager — Browser Extension & System Auto-Installer
// ============================================================================

import { app, dialog, shell, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { getAppDataPath } from './utils/platform-utils';
import { ensureDir } from './utils/file-utils';

const HOST_NAME = 'com.namanrathi.adm';

export class ExtensionInstaller {
  /**
   * Returns the permanent user-accessible path where the browser extension is unpacked
   */
  public static getInstalledExtensionPath(): string {
    return path.join(getAppDataPath(), 'browser-extension');
  }

  /**
   * Resolves the bundled browser-extension source directory in both dev and packaged builds
   */
  private static getBundledExtensionSource(): string | null {
    const candidates = [
      path.join(process.resourcesPath || '', 'browser-extension'),
      path.join(app.getAppPath(), 'browser-extension'),
      path.resolve(__dirname, '../../browser-extension'),
      path.resolve(process.cwd(), 'browser-extension'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'manifest.json'))) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Copies bundled extension into AppData and registers Native Messaging / Browser hooks
   */
  public static provisionExtension(): string | null {
    try {
      const srcDir = ExtensionInstaller.getBundledExtensionSource();
      if (!srcDir) return null;

      const destDir = ExtensionInstaller.getInstalledExtensionPath();
      ensureDir(destDir);
      ExtensionInstaller.copyDirRecursive(srcDir, destDir);

      ExtensionInstaller.registerNativeMessagingHosts();
      return destDir;
    } catch (err: any) {
      console.warn('[ADM ExtensionInstaller] Provisioning warning:', err.message);
      return null;
    }
  }

  private static copyDirRecursive(src: string, dest: string): void {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        ExtensionInstaller.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Registers Native Messaging Host manifests across Chrome, Edge, Brave, Vivaldi, and Firefox
   */
  private static registerNativeMessagingHosts(): void {
    const appDataDir = getAppDataPath();
    const hostDir = path.join(appDataDir, 'native-host');
    ensureDir(hostDir);

    const isWin = process.platform === 'win32';
    const hostScriptPath = path.join(hostDir, 'adm-host.js');

    // Lightweight Node/Electron stdio bridge that forwards native messages to ADM HTTP gateway
    const hostScript = `#!/usr/bin/env node
const http = require('http');
process.stdin.on('readable', () => {
  const header = process.stdin.read(4);
  if (!header) return;
  const len = header.readUInt32LE(0);
  const body = process.stdin.read(len);
  if (!body) return;
  const req = http.request({
    hostname: '127.0.0.1',
    port: 28370,
    path: '/intercept',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
  });
  req.on('error', () => {});
  req.write(body);
  req.end();
});
`;
    fs.writeFileSync(hostScriptPath, hostScript, { encoding: 'utf8', mode: 0o755 });

    let executablePath = hostScriptPath;
    if (isWin) {
      const batPath = path.join(hostDir, 'adm-host.bat');
      fs.writeFileSync(
        batPath,
        `@echo off\r\n"${process.execPath}" --run-as-node "${hostScriptPath}" %*\r\n`,
        'utf8'
      );
      executablePath = batPath;
    }

    const chromiumManifest = {
      name: HOST_NAME,
      description: 'Anything Download Manager Native Messaging Host',
      path: executablePath,
      type: 'stdio',
      allowed_origins: [
        'chrome-extension://*/',
      ],
    };

    const firefoxManifest = {
      name: HOST_NAME,
      description: 'Anything Download Manager Native Messaging Host',
      path: executablePath,
      type: 'stdio',
      allowed_extensions: ['adm@namanrathi.com'],
    };

    const chromiumManifestPath = path.join(hostDir, `${HOST_NAME}.chromium.json`);
    const firefoxManifestPath = path.join(hostDir, `${HOST_NAME}.firefox.json`);

    fs.writeFileSync(chromiumManifestPath, JSON.stringify(chromiumManifest, null, 2), 'utf8');
    fs.writeFileSync(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 2), 'utf8');

    const home = os.homedir();

    if (process.platform === 'darwin') {
      const macChromiumDirs = [
        path.join(home, 'Library/Application Support/Google/Chrome/NativeMessagingHosts'),
        path.join(home, 'Library/Application Support/Chromium/NativeMessagingHosts'),
        path.join(home, 'Library/Application Support/Microsoft Edge/NativeMessagingHosts'),
        path.join(home, 'Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
        path.join(home, 'Library/Application Support/Vivaldi/NativeMessagingHosts'),
      ];
      for (const dir of macChromiumDirs) {
        try {
          ensureDir(dir);
          fs.writeFileSync(path.join(dir, `${HOST_NAME}.json`), JSON.stringify(chromiumManifest, null, 2));
        } catch {}
      }
      try {
        const ffDir = path.join(home, 'Library/Application Support/Mozilla/NativeMessagingHosts');
        ensureDir(ffDir);
        fs.writeFileSync(path.join(ffDir, `${HOST_NAME}.json`), JSON.stringify(firefoxManifest, null, 2));
      } catch {}
    } else if (process.platform === 'linux') {
      const linuxChromiumDirs = [
        path.join(home, '.config/google-chrome/NativeMessagingHosts'),
        path.join(home, '.config/chromium/NativeMessagingHosts'),
        path.join(home, '.config/microsoft-edge/NativeMessagingHosts'),
        path.join(home, '.config/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
        path.join(home, '.config/vivaldi/NativeMessagingHosts'),
      ];
      for (const dir of linuxChromiumDirs) {
        try {
          ensureDir(dir);
          fs.writeFileSync(path.join(dir, `${HOST_NAME}.json`), JSON.stringify(chromiumManifest, null, 2));
        } catch {}
      }
      try {
        const ffDir = path.join(home, '.mozilla/native-messaging-hosts');
        ensureDir(ffDir);
        fs.writeFileSync(path.join(ffDir, `${HOST_NAME}.json`), JSON.stringify(firefoxManifest, null, 2));
      } catch {}
    } else if (process.platform === 'win32') {
      const regKeys = [
        `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
        `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_NAME}`,
        `HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\${HOST_NAME}`,
        `HKCU\\Software\\Vivaldi\\NativeMessagingHosts\\${HOST_NAME}`,
      ];
      for (const key of regKeys) {
        execFile('reg', ['add', key, '/ve', '/t', 'REG_SZ', '/d', chromiumManifestPath, '/f'], () => {});
      }
      execFile(
        'reg',
        [
          'add',
          `HKCU\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}`,
          '/ve',
          '/t',
          'REG_SZ',
          '/d',
          firefoxManifestPath,
          '/f',
        ],
        () => {}
      );
    }
  }

  /**
   * Configures OS-level auto-start on login across Windows, macOS, and Linux
   */
  public static applyAutoStart(enabled: boolean): void {
    try {
      if (process.platform === 'darwin' || process.platform === 'win32') {
        if (app.isPackaged) {
          app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: true,
            args: ['--hidden'],
          });
        }
      } else if (process.platform === 'linux') {
        const autostartDir = path.join(
          process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
          'autostart'
        );
        const desktopFile = path.join(autostartDir, 'anything-download-manager.desktop');

        if (enabled && app.isPackaged) {
          ensureDir(autostartDir);
          const execPath = process.env.APPIMAGE || process.execPath;
          const content = [
            '[Desktop Entry]',
            'Type=Application',
            'Name=Anything Download Manager',
            'Comment=High-speed multi-segment download manager',
            `Exec="${execPath}" --hidden`,
            'Terminal=false',
            'StartupNotify=false',
            'X-GNOME-Autostart-enabled=true',
          ].join('\n');
          fs.writeFileSync(desktopFile, content, 'utf8');
        } else if (!enabled && fs.existsSync(desktopFile)) {
          fs.unlinkSync(desktopFile);
        }
      }
    } catch (err: any) {
      console.warn('[ADM AutoStart] Failed to update login item settings:', err.message);
    }
  }

  /**
   * On macOS, detects if user is running ADM directly from the mounted DMG instead of /Applications
   */
  public static async ensureInstalledInApplications(): Promise<void> {
    if (process.platform !== 'darwin' || !app.isPackaged) return;
    try {
      if (!app.isInApplicationsFolder()) {
        const { response } = await dialog.showMessageBox({
          type: 'question',
          buttons: ['Move to Applications Folder', 'Do Not Move'],
          defaultId: 0,
          cancelId: 1,
          title: 'Install Anything Download Manager',
          message: 'Move Anything Download Manager to your Applications folder?',
          detail:
            'Moving ADM to Applications ensures it stays permanently installed on your Mac and starts automatically in the menu bar.',
        });

        if (response === 0) {
          app.moveToApplicationsFolder();
        }
      }
    } catch (err: any) {
      console.warn('[ADM] Could not move to Applications folder:', err.message);
    }
  }

  /**
   * Interactive helper that opens the unpacked extension folder and copies the path for 1-click browser loading
   */
  public static async promptAndOpenExtensionFolder(): Promise<void> {
    const extPath = ExtensionInstaller.provisionExtension() || ExtensionInstaller.getInstalledExtensionPath();
    clipboard.writeText(extPath);

    const { response } = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Open Extension Folder & Copy Path', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Activate ADM Browser Extension',
      message: 'ADM Browser Extension is bundled and ready!',
      detail:
        `The extension folder path has been copied to your clipboard:\n${extPath}\n\n` +
        'To activate in Chrome, Edge, or Brave:\n' +
        '1. Open chrome://extensions (or edge://extensions / brave://extensions)\n' +
        '2. Enable "Developer mode" (top-right toggle)\n' +
        '3. Click "Load unpacked" and select the opened folder.',
    });

    if (response === 0) {
      shell.openPath(extPath);
    }
  }
}
