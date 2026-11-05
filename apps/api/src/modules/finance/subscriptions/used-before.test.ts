import { describe, expect, it } from 'vitest';
import { assertUsedBeforeFits } from './used-before';

// Every lesson but one (usedBeforeMax, owner 2026-11-02): the course books whatever is left.
describe('assertUsedBeforeFits', () => {
  const code = (used: number, total: number) => {
    try {
      assertUsedBeforeFits(used, total);
      return null;
    } catch (e) {
      return (e as { getResponse: () => { code: string } }).getResponse().code;
    }
  };

  it('8 lessons, 2 days a week: 7 fits (one lesson left), 8 is the whole package', () => {
    expect([code(6, 8), code(7, 8)]).toEqual([null, null]);
    expect(code(8, 8)).toBe('used_before_too_many');
  });

  it('12/11, 16/15 and 28/27 fit; the whole package is refused', () => {
    expect([code(11, 12), code(15, 16), code(27, 28)]).toEqual([null, null, null]);
    expect([code(12, 12), code(16, 16), code(28, 28)]).toEqual(Array(3).fill('used_before_too_many'));
  });

  it('a custom count keeps every lesson but one; none is always fine', () => {
    expect(code(9, 10)).toBeNull();
    expect(code(10, 10)).toBe('used_before_too_many');
    expect(code(0, 8)).toBeNull();
  });
});
