import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { decode, encode } from '../png.mjs';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// decode() skips the CRC, so these test chunks carry zeros.
const chunk = (type, body) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  return Buffer.concat([head, body, Buffer.alloc(4)]);
};
const rgbPng = ({ width, height }, rows) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.from(rows.flat());
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw))]);
};
const bytes = (img) => Array.from(img.data, (v) => Math.round(v * 255));

test('encode → decode keeps 8-bit RGBA exactly', () => {
  const img = { width: 2, height: 1, data: Float32Array.from([1, 0, 0, 1, 0, 0.5, 1, 0.25]) };
  assert.deepEqual(bytes(decode(encode(img))), bytes(img));
});

test('encode(opaque) writes RGB: alpha reads back as 1, out-of-range values clamp', () => {
  const img = { width: 1, height: 2, data: Float32Array.from([2, -1, 0.5, 0.1, 0, 1, 0, 0]) };
  assert.deepEqual(bytes(decode(encode(img, true))), [255, 0, 128, 255, 0, 255, 0, 255]);
});

test('decode undoes the Paeth filter: the up-left, left and up predictor each win a channel', () => {
  // 2×2 RGB, row 1 Paeth-filtered. Pixel (1,1): R picks up-left, G picks left, B picks up.
  const row0 = [0, 15, 20, 10, 10, 20, 30];
  const row1 = [4, 5, 246, 0, 0, 0, 0];
  const img = decode(rgbPng({ width: 2, height: 2 }, [row0, row1]));
  const pixels = [15, 20, 10, 255, 10, 20, 30, 255, 20, 10, 10, 255, 15, 10, 30, 255];
  assert.deepEqual(bytes(img), pixels);
});

test('decode refuses a file that is not a PNG, or an unsupported one', () => {
  assert.throws(() => decode(Buffer.from('not a png at all')), /not a PNG/);
  const ihdr = Buffer.alloc(13);
  ihdr[8] = 16;
  assert.throws(() => decode(Buffer.concat([SIG, chunk('IHDR', ihdr)])), /unsupported PNG/);
});
