// Minimal PNG codec on node:zlib (no dependency): reads 8-bit RGB/RGBA non-interlaced files (the
// brand logos), writes 8-bit RGBA or RGB. Images are { width, height, data: Float32Array RGBA 0..1 }.
import { deflateSync, inflateSync } from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The header fields and the concatenated IDAT data of a PNG (8-bit RGB or RGBA, no interlace). */
function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  const head = { width: 0, height: 0, ctype: 0 };
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('ascii', o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') Object.assign(head, ihdr(body));
    if (type === 'IDAT') idat.push(body);
    o += 12 + len;
  }
  return { ...head, idat: Buffer.concat(idat) };
}

/** Width, height and colour type from IHDR; only 8-bit, non-interlaced RGB or RGBA is supported. */
function ihdr(body) {
  const ctype = body[9];
  if (body[8] !== 8 || body[12] !== 0 || (ctype !== 2 && ctype !== 6)) throw new Error('unsupported PNG');
  return { width: body.readUInt32BE(0), height: body.readUInt32BE(4), ctype };
}

/** One scanline un-filtered in place into `px` (filters 0–4). */
function unfilterRow(raw, px, { y, stride, bpp }) {
  const f = raw[y * (stride + 1)];
  const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? px[y * stride + x - bpp] : 0;
    const b = y > 0 ? px[(y - 1) * stride + x] : 0;
    const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
    const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][f];
    px[y * stride + x] = (line[x] + pred) & 255;
  }
}

export function decode(buf) {
  const { width, height, ctype, idat } = readChunks(buf);
  const bpp = ctype === 6 ? 4 : 3;
  const raw = inflateSync(idat);
  const stride = width * bpp;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) unfilterRow(raw, px, { y, stride, bpp });
  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++) data[i * 4 + k] = px[i * bpp + k] / 255;
    data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] / 255 : 1;
  }
  return { width, height, data };
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** `opaque` writes RGB (iOS app icons must have no alpha channel). Filter 0 per line; zlib does the rest. */
export function encode({ width, height, data }, opaque = false) {
  const bpp = opaque ? 3 : 4;
  const raw = Buffer.alloc((width * bpp + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = y * (width * bpp + 1) + 1 + x * bpp;
      for (let k = 0; k < bpp; k++) raw[o + k] = Math.round(Math.min(1, Math.max(0, data[i + k])) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
