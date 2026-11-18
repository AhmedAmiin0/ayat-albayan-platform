// The web apps' tab and Home Screen icons (docs/07 §11, docs/51 §1 «Brand»), written into the
// one brand package (packages/web-kit/icons/<app>/) that both web apps serve at their root.
//   staff:  the emblem on the brand paper (≤ 32 px: the Mushaf crop, transparent).
//   family: the same emblem on the deep brand-green tile (theme.ts brandTile, the family mobile
//           app icon), a rounded tile in the tab, full bleed on the Home Screen, plus a maskable.
import { encode } from './png.mjs';
import { place } from './resample.mjs';

const TILE = [0x06, 0x4e, 0x3b].map((v) => v / 255); // theme.ts brandTile #064E3B

/** ICO holding PNG frames (Vista+ format): what browsers fetch at /favicon.ico. */
export function ico(frames) {
  const head = Buffer.alloc(6 + 16 * frames.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(frames.length, 4);
  let offset = head.length;
  frames.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    head[e] = size % 256;
    head[e + 1] = size % 256;
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...frames.map((f) => f.png)]);
}

/** Clears the corners outside a rounded square of radius `r` (share of the side), anti-aliased. */
function rounded(img, r) {
  const n = img.width, rad = n * r;
  for (let i = 0; i < n * n; i++) {
    const dx = Math.max(0, rad - (i % n) - 0.5, (i % n) + 0.5 - (n - rad));
    const dy = Math.max(0, rad - ((i / n) | 0) - 0.5, ((i / n) | 0) + 0.5 - (n - rad));
    const out = Math.hypot(dx, dy) - rad;
    img.data[i * 4 + 3] *= Math.min(1, Math.max(0, 0.5 - out));
  }
  return img;
}

/** A green tab tile: the mark at `fill` on the tile, corners rounded (opaque files cannot be). */
const tab = (mark, w, fill) => encode(rounded(place(mark, { w, fill, bg: TILE }), 0.2));

/** The family set: every file on the green ground; the maskable keeps the 80% safe circle. */
export function familyIcons({ master, mushaf }, write) {
  const dir = 'packages/web-kit/icons/family';
  const fav16 = tab(mushaf, 16, 0.84), fav32 = tab(mushaf, 32, 0.84), fav48 = tab(master, 48, 0.86);
  const square = (w, fill) => encode(place(master, { w, fill, bg: TILE }), true);
  write(`${dir}/favicon.ico`, ico([
    { size: 16, png: fav16 }, { size: 32, png: fav32 }, { size: 48, png: fav48 },
  ]));
  write(`${dir}/favicon-16.png`, fav16);
  write(`${dir}/favicon-32.png`, fav32);
  write(`${dir}/apple-touch-icon.png`, square(180, 0.8));
  write(`${dir}/icon-192.png`, square(192, 0.8));
  write(`${dir}/icon-512.png`, square(512, 0.8));
  write(`${dir}/icon-maskable-512.png`, square(512, 0.62));
}
