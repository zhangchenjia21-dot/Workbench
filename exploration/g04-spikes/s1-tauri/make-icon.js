// Generates a minimal valid 16x16 32-bit ICO for the disposable G0.4 Tauri build.
// EXPLORATION / NOT CANONICAL ARCHITECTURE / NOT PRODUCTION COMMITMENT
const fs = require('fs');
const path = require('path');

const width = 16;
const height = 16;
const xorSize = width * height * 4;
const andStride = Math.ceil(width / 32) * 4;
const andSize = andStride * height;
const dibSize = 40 + xorSize + andSize;
const out = Buffer.alloc(6 + 16 + dibSize);
let o = 0;

// ICONDIR
out.writeUInt16LE(0, o); o += 2;
out.writeUInt16LE(1, o); o += 2;
out.writeUInt16LE(1, o); o += 2;

// ICONDIRENTRY
out.writeUInt8(width, o++);
out.writeUInt8(height, o++);
out.writeUInt8(0, o++); // palette colors
out.writeUInt8(0, o++);
out.writeUInt16LE(1, o); o += 2; // planes
out.writeUInt16LE(32, o); o += 2; // bpp
out.writeUInt32LE(dibSize, o); o += 4;
out.writeUInt32LE(22, o); o += 4;

// BITMAPINFOHEADER. ICO DIB height includes XOR + AND masks.
out.writeUInt32LE(40, o); o += 4;
out.writeInt32LE(width, o); o += 4;
out.writeInt32LE(height * 2, o); o += 4;
out.writeUInt16LE(1, o); o += 2;
out.writeUInt16LE(32, o); o += 2;
out.writeUInt32LE(0, o); o += 4; // BI_RGB
out.writeUInt32LE(xorSize, o); o += 4;
out.writeInt32LE(0, o); o += 4;
out.writeInt32LE(0, o); o += 4;
out.writeUInt32LE(0, o); o += 4;
out.writeUInt32LE(0, o); o += 4;

// BGRA pixels: opaque blue-green square. AND mask stays all-zero (fully opaque).
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    out[o++] = 0x88; // B
    out[o++] = 0x66; // G
    out[o++] = 0x33; // R
    out[o++] = 0xff; // A
  }
}

const target = path.join(__dirname, 'src-tauri', 'icons', 'icon.ico');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
console.log(`generated ${target} (${out.length} bytes)`);
