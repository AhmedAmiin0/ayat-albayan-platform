import { describe, expect, it } from 'vitest';
import { parseDiscount } from './catalog.js';

describe('parseDiscount (the site\'s free discount field)', () => {
  it.each([
    ['7', 7],
    ['12.5', 12.5],
    ['12.', 12],
    ['', 0],
    ['abc', 0],
    ['-5', 0],
    ['150', 100],
    ['١٢٫٥', 12.5],
    ['12,5', 12.5],
    ['۱۲٫۵', 12.5],
  ])('%j → %d', (text, want) => expect(parseDiscount(text)).toBe(want));
});
