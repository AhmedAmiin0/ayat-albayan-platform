import { describe, expect, it } from 'vitest';
import { looksLikeFamilyToken } from './room';

describe('looksLikeFamilyToken', () => {
  it('70 url-safe characters: a family join token', () => {
    expect(looksLikeFamilyToken('a'.repeat(48) + 'B-_'.repeat(7) + 'x')).toBe(true);
  });

  it('a random lesson link (32), a wrong length or a dotted token is not', () => {
    expect(looksLikeFamilyToken('a'.repeat(32))).toBe(false);
    expect(looksLikeFamilyToken('a'.repeat(69))).toBe(false);
    expect(looksLikeFamilyToken(`${'a'.repeat(48)}.${'b'.repeat(21)}`)).toBe(false);
  });
});
