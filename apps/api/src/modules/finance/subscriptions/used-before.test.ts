import { describe, expect, it } from 'vitest';
import { assertUsedBeforeFits } from './used-before';

// One lesson left per course day (usedBeforeMax): else the sales course check is 400 no_occurrences.
describe('assertUsedBeforeFits', () => {
  const code = (used: number, total: number) => {
    try {
      assertUsedBeforeFits(used, total);
      return null;
    } catch (e) {
      return (e as { getResponse: () => { code: string } }).getResponse().code;
    }
  };

  it('8 lessons, 2 days a week: 6 fits, 7 leaves 1 lesson for 2 days', () => {
    expect(code(6, 8)).toBeNull();
    expect(code(7, 8)).toBe('used_before_too_many');
  });

  it('12/10, 16/13 and 28/22 are refused; 12/9, 16/12, 28/21 fit', () => {
    expect([code(10, 12), code(13, 16), code(22, 28)]).toEqual(Array(3).fill('used_before_too_many'));
    expect([code(9, 12), code(12, 16), code(21, 28)]).toEqual([null, null, null]);
  });

  it('a custom count the admin books keeps every lesson but one; none is always fine', () => {
    expect(code(9, 10)).toBeNull();
    expect(code(10, 10)).toBe('used_before_too_many');
    expect(code(0, 8)).toBeNull();
  });
});
