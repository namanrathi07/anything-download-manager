// ============================================================================
// Anything Download Manager — High-Quality Brand Icon Generator
// ============================================================================

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard PNG Encoder (supports 32-bit RGBA with Deflate)
function createPngRGBA(width, height, pixelBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 13 bytes
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6 = RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data: for each scanline: 1 filter byte (0) + width * 4 bytes (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rawOffset = y * rowSize;
    rawData[rawOffset] = 0; // Filter None
    const srcOffset = y * width * 4;
    pixelBuffer.copy(rawData, rawOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.slice(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

// ─── Mathematical Geometry & Rasterizer ──────────────────────────────────────

// Check if (x,y) is inside rounded rectangle
function sdRoundBox(x, y, bx, by, r) {
  const qx = Math.abs(x) - bx + r;
  const qy = Math.abs(y) - by + r;
  const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  return dist;
}

// Check distance to line segment
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.hypot(dx, dy);
}

// Render App Icon
function renderAppIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const cornerR = size * 0.22;
  const boxW = size * 0.44;
  const boxH = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = (x - half);
      const ny = (y - half);

      // Distance to squircle container
      const dist = sdRoundBox(nx, ny, boxW, boxH, cornerR);

      if (dist > 1.0) {
        // Outside squircle -> Transparent
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Smooth anti-aliasing edge
      let alpha = 1.0;
      if (dist > 0.0) {
        alpha = Math.max(0, 1.0 - dist);
      }

      // Background gradient (Top-left deep navy to bottom-right obsidian)
      const gradT = (x + y) / (size * 2);
      let r = 11 + (2 - 11) * gradT;
      let g = 19 + (6 - 19) * gradT;
      let b = 43 + (15 - 43) * gradT;

      // Rim glow (specular neon highlight around border)
      if (dist > -4.0 && dist <= 0.0) {
        const rimStrength = (4.0 + dist) / 4.0;
        r += 56 * rimStrength * (1.0 - y / size);
        g += 189 * rimStrength * (1.0 - y / size);
        b += 248 * rimStrength * (1.0 - y / size);
      }

      // Radial central glow
      const centerDist = Math.hypot(nx, ny) / half;
      if (centerDist < 0.8) {
        const glow = (1.0 - centerDist / 0.8) * 0.25;
        r += 37 * glow * 2.5;
        g += 99 * glow * 2.5;
        b += 235 * glow * 2.5;
      }

      // ─── Downward Stream Arrow & Multi-Segment Wings ───────────
      const u = (x / size); // 0 to 1
      const v = (y / size); // 0 to 1

      // 1. Central Stem & Downward Arrowhead
      const inCentralStem = (u >= 0.44 && u <= 0.56 && v >= 0.22 && v <= 0.56);
      
      // Arrowhead triangle (base from v=0.56, apex at (0.50, 0.70))
      let inArrowhead = false;
      if (v >= 0.56 && v <= 0.72) {
        const arrowW = (0.72 - v) / (0.72 - 0.56) * 0.16;
        if (Math.abs(u - 0.50) <= (0.16 - (v - 0.56) * (0.16 / 0.16))) {
          inArrowhead = true;
        }
      }

      // Left stream wing (u: 0.32 - 0.40, v: 0.28 - 0.52)
      const inLeftWing = (u >= 0.33 && u <= 0.39 && v >= 0.28 && v <= 0.50);

      // Right stream wing (u: 0.60 - 0.67, v: 0.28 - 0.52)
      const inRightWing = (u >= 0.61 && u <= 0.67 && v >= 0.28 && v <= 0.50);

      // Bottom Receiver Tray (u: 0.26 - 0.74, v: 0.74 - 0.82)
      const inTrayBase = (u >= 0.28 && u <= 0.72 && v >= 0.78 && v <= 0.82);
      const inTrayLeft = (u >= 0.28 && u <= 0.32 && v >= 0.68 && v <= 0.82);
      const inTrayRight = (u >= 0.68 && u <= 0.72 && v >= 0.68 && v <= 0.82);
      const inTray = inTrayBase || inTrayLeft || inTrayRight;

      if (inCentralStem || inArrowhead) {
        // Vibrant electric blue to bright cyan core
        const arrowT = (v - 0.22) / 0.50;
        r = 56 * (1 - arrowT) + 37 * arrowT;
        g = 189 * (1 - arrowT) + 99 * arrowT;
        b = 248 * (1 - arrowT) + 235 * arrowT;

        // Center spine white highlight
        if (Math.abs(u - 0.50) < 0.02 && v >= 0.26 && v <= 0.64) {
          r = 255;
          g = 255;
          b = 255;
        }
      } else if (inLeftWing || inRightWing) {
        // Multi-segment wing colors (cyan-violet accents)
        r = inLeftWing ? 96 : 129;
        g = inLeftWing ? 165 : 140;
        b = inLeftWing ? 250 : 248;
      } else if (inTray) {
        // High contrast glowing tray
        r = 56;
        g = 189;
        b = 248;
      }

      buf[idx] = Math.min(255, Math.max(0, Math.round(r)));
      buf[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      buf[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      buf[idx + 3] = Math.min(255, Math.max(0, Math.round(alpha * 255)));
    }
  }

  return buf;
}

// Render Crisp Monochrome / Template Tray Icon
function renderTrayIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / (size - 1);
      const v = y / (size - 1);

      // Central Arrow Stem
      const inStem = (u >= 0.44 && u <= 0.56 && v >= 0.12 && v <= 0.52);

      // Arrowhead Point
      let inArrow = false;
      if (v >= 0.48 && v <= 0.68) {
        const relV = (v - 0.48) / 0.20;
        const maxDist = (1.0 - relV) * 0.26;
        if (Math.abs(u - 0.50) <= maxDist) {
          inArrow = true;
        }
      }

      // Parallel Speed Streamers (Left & Right)
      const inLeftWing = (u >= 0.24 && u <= 0.32 && v >= 0.24 && v <= 0.48);
      const inRightWing = (u >= 0.68 && u <= 0.76 && v >= 0.24 && v <= 0.48);

      // Bottom Cradle Tray
      const inTrayBase = (u >= 0.18 && u <= 0.82 && v >= 0.78 && v <= 0.86);
      const inTrayLeft = (u >= 0.18 && u <= 0.26 && v >= 0.64 && v <= 0.86);
      const inTrayRight = (u >= 0.74 && u <= 0.82 && v >= 0.64 && v <= 0.86);
      const inTray = inTrayBase || inTrayLeft || inTrayRight;

      if (inStem || inArrow || inLeftWing || inRightWing || inTray) {
        buf[idx] = 255;     // Pure White
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = 255; // Fully opaque
      } else {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;   // Transparent
      }
    }
  }

  return buf;
}

// ─── Output Generation ──────────────────────────────────────────────────────

const assetsDir = path.join(__dirname, '../assets');
const extIconsDir = path.join(__dirname, '../browser-extension/icons');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(extIconsDir)) fs.mkdirSync(extIconsDir, { recursive: true });

console.log('Generating high-resolution brand icons...');

// 1. App Icon 512x512
const icon512 = renderAppIcon(512);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPngRGBA(512, 512, icon512));
console.log('✓ Created assets/icon.png (512x512)');

// 2. App Icon 256x256
const icon256 = renderAppIcon(256);
fs.writeFileSync(path.join(assetsDir, 'icon-256.png'), createPngRGBA(256, 256, icon256));
console.log('✓ Created assets/icon-256.png (256x256)');

// 3. System Tray Icons (16x16 standard & 32x32 @2x retina)
const tray16 = renderTrayIcon(16);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), createPngRGBA(16, 16, tray16));
console.log('✓ Created assets/tray-icon.png (16x16 standard)');

const tray32 = renderTrayIcon(32);
fs.writeFileSync(path.join(assetsDir, 'tray-icon@2x.png'), createPngRGBA(32, 32, tray32));
console.log('✓ Created assets/tray-icon@2x.png (32x32 retina)');

// 4. Browser Extension Icons (16, 32, 48, 128)
fs.writeFileSync(path.join(extIconsDir, 'icon-16.png'), createPngRGBA(16, 16, renderAppIcon(16)));
fs.writeFileSync(path.join(extIconsDir, 'icon-32.png'), createPngRGBA(32, 32, renderAppIcon(32)));
fs.writeFileSync(path.join(extIconsDir, 'icon-48.png'), createPngRGBA(48, 48, renderAppIcon(48)));
fs.writeFileSync(path.join(extIconsDir, 'icon-128.png'), createPngRGBA(128, 128, renderAppIcon(128)));
console.log('✓ Created browser-extension/icons (16, 32, 48, 128)');

console.log('All brand icons generated successfully!');
