import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pixelsFromBase64 } from '../pixels';

test('pixelsFromBase64 reads the RGBA bytes the page sends as base64', () => {
  const bytes = [0, 128, 255, 255, 7, 8, 9, 10];
  const pixels = pixelsFromBase64(Buffer.from(bytes).toString('base64'));
  assert.ok(pixels instanceof Uint8ClampedArray);
  assert.deepEqual(Array.from(pixels), bytes);
});

test('pixelsFromBase64 gives an empty buffer for an empty image', () => {
  assert.equal(pixelsFromBase64('').length, 0);
});
