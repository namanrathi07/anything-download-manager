#!/usr/bin/env node
// ============================================================================
// Anything Download Manager — Automated Version Release Script
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const manifestPath = path.join(rootDir, 'browser-extension', 'manifest.json');
const docsPath = path.join(rootDir, 'docs', 'index.html');

// 1. Read current version
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const type = process.argv[2] || 'patch';

let newVersion = '';

if (type.match(/^\d+\.\d+\.\d+/)) {
  newVersion = type;
} else {
  const parts = currentVersion.split('.').map((n) => parseInt(n, 10));
  if (type === 'major') {
    newVersion = `${parts[0] + 1}.0.0`;
  } else if (type === 'minor') {
    newVersion = `${parts[0]}.${parts[1] + 1}.0`;
  } else {
    // patch
    newVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

console.log(`\n📦 Bumping ADM version: v${currentVersion} ➔ v${newVersion} (${type})\n`);

// 2. Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log('✓ Updated package.json');

// 3. Update browser-extension/manifest.json
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('✓ Updated browser-extension/manifest.json');
}

// 4. Update package-lock.json
if (fs.existsSync(packageLockPath)) {
  const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  lock.version = newVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = newVersion;
  }
  fs.writeFileSync(packageLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log('✓ Updated package-lock.json');
}

// 5. Update docs/index.html version badge
if (fs.existsSync(docsPath)) {
  let docsHtml = fs.readFileSync(docsPath, 'utf8');
  docsHtml = docsHtml.replace(
    new RegExp(`>v${currentVersion.replace(/\./g, '\\.')}<`, 'g'),
    `>v${newVersion}<`
  );
  fs.writeFileSync(docsPath, docsHtml, 'utf8');
  console.log('✓ Updated docs/index.html');
}

// 6. Repackage browser extension
try {
  execSync('node scripts/package-extension.js', { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.warn('⚠️ Could not repackage extension:', e.message);
}

// 7. Git commit and tag
try {
  execSync('git add package.json package-lock.json browser-extension/manifest.json docs/index.html', {
    stdio: 'inherit',
    cwd: rootDir,
  });
  execSync(`git commit -m "chore(release): v${newVersion}"`, { stdio: 'inherit', cwd: rootDir });
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit', cwd: rootDir });
  console.log(`✓ Created git commit and tag v${newVersion}`);
} catch (e) {
  console.warn('⚠️ Git commit/tag notice:', e.message);
}

console.log(`
🎉 Successfully prepared Anything Download Manager v${newVersion}!

👉 Next step: Push to GitHub to trigger multi-OS binary builds and publish release:
   git push origin main && git push origin v${newVersion}
`);
