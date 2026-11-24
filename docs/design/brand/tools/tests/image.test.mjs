import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crop, monochrome, opaqueBox } from '../image.mjs';
import { strokeAlpha } from '../pixels.mjs';

const BG = [1, 1, 1];
const image = (width, height, alphas) => {
  const data = new Float32Array(width * height * 4);
  alphas.forEach((a, i) => data.set([0, 0, 0, a], i * 4));
  return { width, height, data };
};

test('opaqueBox: the tight box around visible pixels, grown by pad and kept inside', () => {
  const img = image(4, 3, [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0.01, 0]);
  assert.deepEqual(opaqueBox(img), { x: 1, y: 1, w: 2, h: 1 });
  assert.deepEqual(opaqueBox(img, 5), { x: 0, y: 0, w: 4, h: 3 });
});

test('crop copies the rows of the box', () => {
  const img = image(3, 2, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  const out = crop(img, { x: 1, y: 0, w: 2, h: 2 });
  assert.deepEqual(
    Array.from({ length: 4 }, (_, i) => out.data[i * 4 + 3]),
    [0.2, 0.3, 0.5, 0.6].map(Math.fround),
  );
});

test('monochrome: white ink whose alpha is the stroke strength against the paper', () => {
  const out = monochrome(image(2, 1, [1, 0.5]), BG);
  assert.deepEqual(Array.from(out.data), [1, 1, 1, 1, 1, 1, 1, 0.5]);
});

test('strokeAlpha: only darkening counts, solid strokes cap at 1', () => {
  assert.equal(strokeAlpha([1, 1, 1], BG), 0);
  assert.equal(strokeAlpha([0.15, 0.9, 0.9], BG), 1);
  assert.equal(strokeAlpha([1.2, 1, 1], [0.5, 0.5, 0.5]), 0);
  assert.ok(Math.abs(strokeAlpha([0.575, 1, 1], BG) - 0.5) < 1e-9);
});
