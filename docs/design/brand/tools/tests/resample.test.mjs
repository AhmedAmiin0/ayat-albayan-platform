import assert from 'node:assert/strict';
import { test } from 'node:test';
import { place } from '../resample.mjs';

const RED = { width: 1, height: 1, data: Float32Array.from([1, 0, 0, 1]) };
const pixel = (img, x, y) =>
  Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

test('place centres the scaled image on a clear canvas', () => {
  const out = place(RED, { w: 4, fill: 0.5 });
  assert.deepEqual(pixel(out, 0, 0), [0, 0, 0, 0]);
  assert.deepEqual(pixel(out, 1, 1), [1, 0, 0, 1]);
  assert.deepEqual(pixel(out, 2, 2), [1, 0, 0, 1]);
  assert.deepEqual(pixel(out, 3, 3), [0, 0, 0, 0]);
});

test('place fills the canvas with bg under the image', () => {
  const out = place(RED, { w: 3, h: 1, fill: 1 / 3, bg: [0, 0, 1] });
  assert.deepEqual(pixel(out, 0, 0), [0, 0, 1, 1]);
  assert.deepEqual(pixel(out, 1, 0), [1, 0, 0, 1]);
});

test('place blends a half-clear pixel over bg (straight-alpha over)', () => {
  const half = { width: 1, height: 1, data: Float32Array.from([1, 0, 0, 0.5]) };
  assert.deepEqual(pixel(place(half, { w: 1, bg: [0, 0, 1] }), 0, 0), [0.5, 0, 0.5, 1]);
});

test('place: a zero-size fit still draws one pixel', () => {
  const out = place(
    { width: 100, height: 1, data: new Float32Array(400).fill(1) },
    { w: 2, fill: 0.1 },
  );
  assert.equal(out.data.filter((v, i) => i % 4 === 3 && v > 0).length, 1);
});
