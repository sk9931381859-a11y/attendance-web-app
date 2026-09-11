const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Precompute CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function createSolidPng(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4), height(4), bit depth(1=8), color type(1=2 RGB), compression(1=0), filter(1=0), interlace(1=0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawLineLen = 1 + width * 3;
  const rawData = Buffer.alloc(rawLineLen * height);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * rawLineLen;
    rawData[lineOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = lineOffset + 1 + x * 3;
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Slate 900 background (#0f172a) with Emerald 500 (#10b981) central emblem
      if (dist < width * 0.35) {
        rawData[pxOffset] = 0x10;
        rawData[pxOffset + 1] = 0xb9;
        rawData[pxOffset + 2] = 0x81;
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const png192 = createSolidPng(192, 192, 0x0f, 0x17, 0x2a);
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192);

const png512 = createSolidPng(512, 512, 0x0f, 0x17, 0x2a);
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512);

console.log('Successfully generated icon-192x192.png and icon-512x512.png');
