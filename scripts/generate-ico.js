// ============================================================================
// Windows .ico Generator (Embedded PNGs)
// ============================================================================

const fs = require('fs');
const path = require('path');

function createIco(pngBuffers) {
  // ICONDIR header: 6 bytes
  // reserved (2 bytes = 0), type (2 bytes = 1 for icon), count (2 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + pngBuffers.length * 16;
  const entries = [];

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

const assetsDir = path.join(__dirname, '../assets');
const extDir = path.join(__dirname, '../browser-extension/icons');

const p16 = fs.readFileSync(path.join(extDir, 'icon-16.png'));
const p32 = fs.readFileSync(path.join(extDir, 'icon-32.png'));
const p48 = fs.readFileSync(path.join(extDir, 'icon-48.png'));
const p256 = fs.readFileSync(path.join(assetsDir, 'icon-256.png'));

const icoBuffer = createIco([
  { width: 16, height: 16, buffer: p16 },
  { width: 32, height: 32, buffer: p32 },
  { width: 48, height: 48, buffer: p48 },
  { width: 256, height: 256, buffer: p256 },
]);

fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
console.log('✓ Created assets/icon.ico for Windows');
