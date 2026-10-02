// Self-check for the brand exports: `node docs/design/brand/tools/check.mjs` after build.mjs.
// Fails loudly if the codec stops round-tripping or the masters lose their transparency/ivory.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './png.mjs';
import { place } from './resample.mjs';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (p) => decode(readFileSync(ROOT + p));
const px = (img, x, y) => Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

// codec: 8-bit RGBA survives encode → decode exactly
const tiny = { width: 2, height: 1, data: Float32Array.from([1, 0, 0, 1, 0, 128 / 255, 1, 64 / 255]) };
assert.deepEqual(Array.from(decode(encode(tiny)).data), Array.from(tiny.data));

// area-average: a 2×1 black/white image becomes one mid-grey pixel
const bw = { width: 2, height: 1, data: Float32Array.from([0, 0, 0, 1, 1, 1, 1, 1]) };
assert.deepEqual(px(place(bw, { w: 1, h: 1 }), 0, 0), [0.5, 0.5, 0.5, 1]);

// master: clear corners (the removed paper), opaque ivory inside the star
const master = read('docs/design/brand/logo-mark-transparent.png');
assert.equal(px(master, 0, 0)[3], 0, 'master corner must be transparent');
const star = px(master, Math.round(master.width / 2) + 60, Math.round(master.height * 0.25));
assert.equal(star[3], 1, 'star field must stay opaque');
assert.ok(star.slice(0, 3).every((v) => v > 0.9), 'star field must stay ivory');

// Mushaf crop: wider than tall, star field cleared above the spine
const mushaf = read('docs/design/brand/logo-mushaf-transparent.png');
assert.ok(mushaf.width > mushaf.height * 1.6, 'Mushaf crop is the wide book on its rahle');
assert.equal(px(mushaf, Math.round(mushaf.width / 2), 2)[3], 0, 'nothing above the spine');

// iOS icon is opaque paper at the corner; adaptive foreground is clear at the corner
assert.deepEqual(px(read('apps/mobile/assets/icon.png'), 0, 0).map((v) => Math.round(v * 255)), [253, 248, 240, 255]);
assert.equal(px(read('apps/mobile/assets/android-icon-foreground.png'), 0, 0)[3], 0);

console.log('brand exports OK');
