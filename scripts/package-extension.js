// ============================================================================
// Script to package browser-extension into a distributable ZIP file
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const extDir = path.join(rootDir, 'browser-extension');
const zipFile = path.join(releaseDir, 'adm-browser-extension.zip');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  // Use system zip command (cross-platform on mac/linux/windows powershell)
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipFile}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${extDir}" && zip -r "${zipFile}" . -x "*.DS_Store"`, { stdio: 'inherit' });
  }

  const stats = fs.statSync(zipFile);
  console.log(`\n✓ Browser extension packaged successfully!`);
  console.log(`  Location: release/adm-browser-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('Failed to package extension:', err.message);
  process.exit(1);
}
