import { describe, expect, it } from 'vitest';
import { fromCents, hasTwoDecimals, round2, toCents } from './cents.js';

describe('cents', () => {
  it('converts to and from piasters without float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1999);
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(toCents(-12.5))).toBe(-12.5);
  });

  it('rounds a sum to 2 decimals', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(19.996)).toBe(20);
    expect(round2(-3.456)).toBe(-3.46);
    expect(round2(7)).toBe(7);
  });

  it('accepts at most 2 decimals', () => {
    expect(hasTwoDecimals(12.34)).toBe(true);
    expect(hasTwoDecimals(0.1 + 0.2)).toBe(true);
    expect(hasTwoDecimals(100)).toBe(true);
    expect(hasTwoDecimals(1.234)).toBe(false);
    expect(hasTwoDecimals(-0.005)).toBe(false);
    expect(hasTwoDecimals(0)).toBe(true);
    expect(hasTwoDecimals(-12.34)).toBe(true);
  });

  // Pinned as they are (plain Math.round over binary floats), so nobody changes them silently:
  // 1.005 * 100 is 100.49999…, and Math.round sends a negative half towards +∞.
  it('keeps the float edge cases of Math.round', () => {
    expect(toCents(1.005)).toBe(100);
    expect(round2(1.005)).toBe(1);
    expect(toCents(0.005)).toBe(1);
    expect(round2(0.005)).toBe(0.01);
    expect(toCents(-0.005)).toBe(-0);
    expect(round2(-1.005)).toBe(-1);
  });
});
