import { describe, expect, it } from 'vitest';
import { earliestTermStart, termStartError } from './terms-dates.js';

const TODAY = '2026-10-06';

describe('termStartError (twin of set_assistant_terms)', () => {
  it('a new part starts today or later, never in the past', () => {
    expect(termStartError('2026-10-06', null, TODAY)).toBeNull();
    expect(termStartError('2026-11-01', undefined, TODAY)).toBeNull();
    expect(termStartError('2026-10-05', null, TODAY)).toBe('start_in_past');
  });

  it('a saved start day can stay or move later, even when it is already in the past', () => {
    expect(termStartError('2026-09-01', '2026-09-01', TODAY)).toBeNull();
    expect(termStartError('2026-09-15', '2026-09-01', TODAY)).toBeNull();
    expect(termStartError('2026-12-01', '2026-09-01', TODAY)).toBeNull();
  });

  it('a saved start day never moves earlier, not even to a day that is still today or later', () => {
    expect(termStartError('2026-08-31', '2026-09-01', TODAY)).toBe('start_earlier');
    expect(termStartError('2026-10-06', '2026-12-01', TODAY)).toBe('start_earlier');
  });

  it('the earliest day is the saved one, else today', () => {
    expect(earliestTermStart('2026-09-01', TODAY)).toBe('2026-09-01');
    expect(earliestTermStart(null, TODAY)).toBe(TODAY);
  });
});
