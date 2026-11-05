import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, looksLikeShortCode, newShortCode } from './short-link.code';

describe('short link codes', () => {
  it('10 base62 characters from crypto random, different every time', () => {
    const codes = new Set(Array.from({ length: 200 }, () => newShortCode()));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(CODE_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('draws again on bytes ≥ 248 (no modulo bias) until it has enough', () => {
    const calls: number[] = [];
    const random = (n: number) => {
      calls.push(n);
      return Buffer.from(
        Array.from({ length: n }, (_, i) => (calls.length === 1 && i % 2 === 0 ? 255 : 0)),
      );
    };
    expect(newShortCode(random)).toBe('AAAAAAAAAA');
    expect(calls.length).toBe(1);
    expect(newShortCode(() => Buffer.from([255, 248, 61]))).toMatch(/^9+$/);
  });

  it('only well-formed codes are looked up', () => {
    expect(looksLikeShortCode('Ab12Cd34Ef')).toBe(true);
    for (const bad of ['', 'short', 'has space1', 'Ab12Cd34Ef/../x', 'a'.repeat(33)])
      expect(looksLikeShortCode(bad)).toBe(false);
  });
});
