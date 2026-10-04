// Generates icons/icon{16,48,128}.png with no dependencies: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [15, 118, 110];
const FG = [255, 255, 255];
const SS = 4; // supersampling per axis

function inRoundRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inTriangle(x, y) {
  const [ax, ay, bx, by, cx, cy] = [0.4, 0.34, 0.4, 0.66, 0.68, 0.5];
  const d = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = d(x, y, ax, ay, bx, by), d2 = d(x, y, bx, by, cx, cy), d3 = d(x, y, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function inBrackets(x, y) {
  const t = 0.07, len = 0.22, lo = 0.17, hi = 1 - 0.17;
  for (const [ox, oy] of [[lo, lo], [hi, lo], [lo, hi], [hi, hi]]) {
    const sx = ox < 0.5 ? 1 : -1, sy = oy < 0.5 ? 1 : -1;
    const dx = (x - ox) * sx, dy = (y - oy) * sy;
    if (dx >= 0 && dx <= len && dy >= 0 && dy <= t) return true;
    if (dy >= 0 && dy <= len && dx >= 0 && dx <= t) return true;
  }
  return false;
}

function render(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size, y = (py + (sy + 0.5) / SS) / size;
          if (!inRoundRect(x, y, 0.22)) continue;
          bg++;
          if (inTriangle(x, y) || inBrackets(x, y)) fg++;
        }
      }
      const n = SS * SS;
      const a = bg / n;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      const f = bg ? fg / bg : 0;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(BG[k] * (1 - f) + FG[k] * f);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  return raw;
}

function crc32(buf) {
  let c, crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(render(size))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const s of [16, 48, 128]) fs.writeFileSync(path.join(dir, `icon${s}.png`), png(s));
console.log('icons written to', dir);
