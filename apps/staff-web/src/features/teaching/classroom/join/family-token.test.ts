import { describe, expect, it } from 'vitest';
import { namesItsStudent } from './family-token';

describe('namesItsStudent', () => {
  it('is true for the family app signed token (70 url-safe characters)', () => {
    expect(namesItsStudent('a'.repeat(48) + 'B-_'.repeat(7) + 'x')).toBe(true);
  });

  it('is false for a random lesson link token, a short or a dotted one', () => {
    expect(namesItsStudent('a'.repeat(32))).toBe(false);
    expect(namesItsStudent('a'.repeat(69))).toBe(false);
    expect(namesItsStudent(`${'a'.repeat(48)}.${'b'.repeat(21)}`)).toBe(false);
  });
});
