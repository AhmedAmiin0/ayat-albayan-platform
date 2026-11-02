import { describe, expect, it } from 'vitest';
import { arabicNameSimilar } from './arabic.js';

// R-STU-03: duplicate-detection pairs taken from docs/02 issue A1 / A3.
describe('arabicNameSimilar — same person (R-STU-03)', () => {
  it.each([
    ['سهيلة', 'سهيله'],
    ['سهيلة', 'سهيلة وجودى'],
    ['سهيله', 'سهيله وجود'],
    ['سهيلة', 'جود وسهيله'],
    ['فاطمه', 'فاطمة'],
    ['فاطمة', 'فاطمة محمد'],
    ['فاطمه محمد', 'فاطمة محمد خان'],
    ['ام ايمان', 'الأستاذة : ام ايمان'],
    ['أبرار', 'ابرار'],
    ['إيمان', 'ايمان'],
    ['آمنة', 'امنه'],
    ['جودى', 'جودي'],
    ['مُحَمَّد', 'محمد'],
    ['ابرار عاطف', 'أبرار عاطف قاسم'],
  ])('%s ~ %s', (a, b) => {
    expect(arabicNameSimilar(a, b)).toBe(true);
    expect(arabicNameSimilar(b, a)).toBe(true);
  });
});

describe('arabicNameSimilar — different people (R-STU-03)', () => {
  it.each([
    ['ام ايمان', 'ام جودي'],
    ['فاطمة', 'سهيلة'],
    ['هند', 'هنادي'],
    ['محمد علي', 'محمد حسن'],
    ['', 'سهيلة'],
    ['', ''],
  ])('%j ≁ %j', (a, b) => {
    expect(arabicNameSimilar(a, b)).toBe(false);
  });
});
