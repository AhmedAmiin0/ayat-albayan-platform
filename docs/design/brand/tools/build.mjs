// Brand exports from the academy's real logo (docs/07 §11). Run from the repo root:
//   node docs/design/brand/tools/build.mjs
// Source: docs/design/brand/logo-mark.png (1536×1024 on ivory #FDF8F0). Writes the transparent
// masters next to it, the web favicons/icons + <Mark> images, and the Expo icon/splash/adaptive set.
// No dependencies: png.mjs is a node:zlib PNG codec, image.mjs + resample.mjs the pixel ops.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './png.mjs';
import { crop, extract, monochrome, opaqueBox } from './image.mjs';
import { place } from './resample.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const BRAND = 'docs/design/brand';
const PAPER = [0xfd, 0xf8, 0xf0].map((v) => v / 255); // T.paper in the Apps Script Brand library

// Paper pockets the two swirl ornaments enclose (source px): the border flood cannot reach them.
const SEEDS = [[521, 417], [547, 452], [1033, 424], [986, 454], [995, 478]];
// Top edge of the open pages in the Mushaf crop (crop px, ~4 px above the gold page line). Everything
// above it is the star field and frame, cleared so the small mark is the Mushaf on its rahle alone.
const PAGE_TOP = [[128, 0], [180, 8], [230, 18], [280, 34], [320, 51], [355, 71], [385, 94], [410, 114],
  [435, 96], [465, 74], [500, 56], [545, 38], [590, 21], [640, 10], [690, 0]];

function curveAt(x) {
  const pts = PAGE_TOP;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
}

/** The Mushaf on its rahle: the emblem below the star, with the star field above the pages cleared. */
function mushafOf(master) {
  const top = 448;
  const cut = crop(master, { x: 0, y: top, w: master.width, h: master.height - top });
  const m = crop(cut, opaqueBox(cut, 2));
  for (let i = 0; i < m.width * m.height; i++) {
    const x = i % m.width, y = (i / m.width) | 0;
    m.data[i * 4 + 3] *= Math.min(1, Math.max(0, (y - curveAt(x)) / 1.5)); // 1.5 px soft edge
  }
  return crop(m, opaqueBox(m, 2));
}

/** ICO holding PNG frames (Vista+ format): what browsers fetch at /favicon.ico. */
function ico(frames) {
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

/**
 * Paper under fully clear pixels: resamplers that skip premultiplying (Expo's Android mipmaps) blend
 * the hidden RGB into the edge, and paper is what every icon background is.
 */
function matte(img) {
  for (let i = 0; i < img.width * img.height; i++) if (img.data[i * 4 + 3] < 0.5 / 255) img.data.set(PAPER, i * 4);
  return img;
}

function write(path, buf) {
  const abs = join(ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buf);
  console.log(`${path}  ${(buf.length / 1024).toFixed(1)} KB`);
}

const source = decode(readFileSync(join(ROOT, BRAND, 'logo-mark.png')));
const cut = extract(source, { seeds: SEEDS });
const master = crop(cut, opaqueBox(cut, 6));
const mushaf = mushafOf(master);
const emblem = (o) => encode(matte(place(master, o)), Boolean(o.bg));
const small = (o) => encode(matte(place(mushaf, o)));
/** Fit by height (`h` px tall), width follows the aspect: the <Mark> images. */
const tall = (img, h) => matte(place(img, { w: Math.round((img.width * h) / img.height), h }));
const wide = (img, w) => matte(place(img, { w, h: Math.round((img.height * w) / img.width) }));

write(`${BRAND}/logo-mark-transparent.png`, encode(matte(crop(master, opaqueBox(master)))));
write(`${BRAND}/logo-mushaf-transparent.png`, encode(matte(crop(mushaf, opaqueBox(mushaf)))));

// Web: favicons (≤ 32 px is the Mushaf crop; the full emblem is illegible there), touch + PWA icons
// on the brand paper, and the two <Mark> images (components/ui/mark.tsx).
const fav16 = small({ w: 16 }), fav32 = small({ w: 32 }), fav48 = emblem({ w: 48 });
write('apps/web/public/favicon.ico', ico([{ size: 16, png: fav16 }, { size: 32, png: fav32 }, { size: 48, png: fav48 }]));
write('apps/web/public/favicon-16.png', fav16);
write('apps/web/public/favicon-32.png', fav32);
write('apps/web/public/apple-touch-icon.png', emblem({ w: 180, fill: 0.8, bg: PAPER }));
write('apps/web/public/icon-192.png', emblem({ w: 192, fill: 0.8, bg: PAPER }));
write('apps/web/public/icon-512.png', emblem({ w: 512, fill: 0.8, bg: PAPER }));
write('apps/web/public/brand/mark.png', encode(tall(master, 192)));
write('apps/web/public/brand/mark-small.png', encode(wide(mushaf, 96)));

// Expo: iOS icon must be opaque; the adaptive foreground keeps the emblem inside the 66 dp safe
// circle of the 108 dp canvas (fill 0.5); monochrome is the line art Android 13 tints.
write('apps/mobile/assets/icon.png', emblem({ w: 1024, fill: 0.8, bg: PAPER }));
write('apps/mobile/assets/android-icon-foreground.png', emblem({ w: 1024, fill: 0.5 }));
const solid = (w, c) => ({ width: w, height: w, data: Float32Array.from({ length: w * w * 4 }, (_, i) => (i % 4 === 3 ? 1 : c[i % 4])) });
write('apps/mobile/assets/android-icon-background.png', encode(solid(1024, PAPER), true));
write('apps/mobile/assets/android-icon-monochrome.png', encode(place(monochrome(master, PAPER), { w: 1024, fill: 0.5 })));
// (monochrome stays white under clear pixels: Android only reads its alpha)
write('apps/mobile/assets/splash-icon.png', emblem({ w: 1024, fill: 0.9 }));
write('apps/mobile/assets/favicon.png', fav48);
write('apps/mobile/assets/brand/mark.png', encode(tall(master, 192)));
write('apps/mobile/assets/brand/mark-small.png', encode(wide(mushaf, 96)));
