// ============================================================================
// Anything Download Manager — Native Messaging Installer
// ============================================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOST_NAME = 'com.adm.native_messaging';
const hostScriptPath = path.resolve(__dirname, 'host.js');

// Make script executable on Unix
try {
  fs.chmodSync(hostScriptPath, '755');
} catch {}

const manifest = {
  name: HOST_NAME,
  description: 'Anything Download Manager Native Messaging Host',
  path: hostScriptPath,
  type: 'stdio',
  allowed_origins: [
    'chrome-extension://*/*',
  ],
};

const home = os.homedir();
const platform = process.platform;

let targetDirs = [];

if (platform === 'darwin') {
  targetDirs = [
    path.join(home, 'Library/Application Support/Google/Chrome/NativeMessagingHosts'),
    path.join(home, 'Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
    path.join(home, 'Library/Application Support/Microsoft Edge/NativeMessagingHosts'),
  ];
} else if (platform === 'linux') {
  targetDirs = [
    path.join(home, '.config/google-chrome/NativeMessagingHosts'),
    path.join(home, '.config/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
    path.join(home, '.config/microsoft-edge/NativeMessagingHosts'),
  ];
}

for (const dir of targetDirs) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const targetPath = path.join(dir, `${HOST_NAME}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2));
    console.log(`Installed native messaging host manifest to: ${targetPath}`);
  } catch (err) {
    // skip non-existent browser configs
  }
}

console.log('Native messaging host registration complete.');
