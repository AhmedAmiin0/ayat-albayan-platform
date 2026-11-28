import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedRatio, compareReport } from '../compare';

const px = (...rgba: number[]): Uint8ClampedArray => Uint8ClampedArray.from(rgba);

test('changedRatio counts the pixels whose colour moved past the tolerance', () => {
  const base = px(0, 0, 0, 255, 10, 10, 10, 255);
  assert.equal(changedRatio(base, px(0, 0, 0, 255, 10, 10, 10, 255)), 0);
  assert.equal(changedRatio(base, px(1, 0, 0, 255, 200, 10, 10, 255)), 0.5);
});

test('changedRatio treats a size change as every pixel changed', () => {
  assert.equal(changedRatio(px(0, 0, 0, 255), px(0, 0, 0, 255, 0, 0, 0, 255)), 1);
});

test('compareReport lists only pages above the limit, then new and missing pages', () => {
  const report = compareReport({
    ratios: { 'staff/a.png': 0.01, 'staff/b.png': 0.001 },
    added: ['staff/c.png'],
    missing: ['staff/d.png'],
  });
  assert.match(report, /staff\/a\.png \| 1\.000 %/);
  assert.doesNotMatch(report, /staff\/b\.png/);
  assert.match(report, /New pages: staff\/c\.png/);
  assert.match(report, /Missing pages: staff\/d\.png/);
});

test('compareReport says so when nothing moved', () => {
  assert.match(compareReport({ ratios: { 'a.png': 0 }, added: [], missing: [] }), /No page/);
});

test('changedRatio reads a full-page pair and counts each moved pixel once', () => {
  const pixels = 1280 * 4000;
  const base = new Uint8ClampedArray(pixels * 4);
  const head = Uint8ClampedArray.from(base);
  head.set([200, 200, 200, 200], 0);
  head.set([0, 0, 0, 17], 4 * (pixels - 1));
  head.set([16, 16, 16, 16], 4 * 10);
  assert.equal(changedRatio(base, head), 2 / pixels);
});

test('changedRatio of two empty images is 0', () => {
  assert.equal(changedRatio(new Uint8ClampedArray(0), new Uint8ClampedArray(0)), 0);
});
