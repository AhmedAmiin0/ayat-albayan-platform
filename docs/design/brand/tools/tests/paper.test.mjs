import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extract } from '../paper.mjs';

const IVORY = [0.99, 0.97, 0.94];
const GREY = [0.5, 0.5, 0.5];
// A size×size ivory sheet with a grey square from `lo` to `hi` (inclusive).
const sheet = (size, { lo, hi }) => {
  const data = new Float32Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const [x, y] = [i % size, Math.floor(i / size)];
    const inside = x >= lo && x <= hi && y >= lo && y <= hi;
    data.set([...(inside ? GREY : IVORY), 1], i * 4);
  }
  return { width: size, height: size, data };
};
const alphaAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3];

test('extract: the paper clears, the emblem body stays opaque, its band un-blends', () => {
  const out = extract(sheet(12, { lo: 3, hi: 8 }), { fringe: 1, island: 0 });
  assert.equal(alphaAt(out, 0, 0), 0);
  assert.equal(alphaAt(out, 5, 5), 1);
  const band = alphaAt(out, 3, 3);
  assert.ok(band > 0.5 && band < 0.7, `band alpha ${band}`);
});

test('extract: an emblem part smaller than `island` joins the band', () => {
  const out = extract(sheet(12, { lo: 3, hi: 8 }), { fringe: 1, island: 64 });
  assert.equal(alphaAt(out, 5, 5), alphaAt(out, 3, 3));
});

test('extract: a wider fringe reaches further into the emblem', () => {
  const out = extract(sheet(12, { lo: 3, hi: 8 }), { fringe: 2, island: 0 });
  assert.equal(alphaAt(out, 4, 4), alphaAt(out, 3, 3));
  assert.equal(alphaAt(out, 5, 5), 1);
});

test('extract: a seed clears paper the border fill cannot reach', () => {
  const img = sheet(9, { lo: 1, hi: 7 });
  img.data.set([...IVORY, 1], (4 * 9 + 4) * 4);
  const kept = extract(img, { fringe: 0, island: 0 });
  const seeded = extract(img, { fringe: 0, island: 0, seeds: [[4, 4]] });
  assert.equal(alphaAt(kept, 4, 4), 1);
  assert.equal(alphaAt(seeded, 4, 4), 0);
});
