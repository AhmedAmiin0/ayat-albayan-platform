import { describe, expect, it } from 'vitest';
import { digestEqual, safeEqual } from '@/common/infra/crypto/safe-equal';

describe('safeEqual', () => {
  it('is true for equal strings and equal buffers', () => {
    expect(safeEqual('sha256=ab', 'sha256=ab')).toBe(true);
    expect(safeEqual(Buffer.from([1, 2]), Buffer.from([1, 2]))).toBe(true);
  });

  it('is false for different values of the same length', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
  });

  it('is a plain false, not a throw, for different lengths', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual(Buffer.from([1]), Buffer.from([1, 2]))).toBe(false);
  });

  it('compares strings by their utf8 bytes', () => {
    expect(safeEqual('é', 'e')).toBe(false);
    expect(safeEqual('مفتاح', 'مفتاح')).toBe(true);
  });
});

describe('digestEqual', () => {
  it('is true only for equal strings', () => {
    expect(digestEqual('token-1', 'token-1')).toBe(true);
    expect(digestEqual('token-1', 'token-2')).toBe(false);
  });

  it('is false, not a throw, for a prefix or an empty side', () => {
    expect(digestEqual('token', 'token-1')).toBe(false);
    expect(digestEqual('', 'token')).toBe(false);
  });
});
