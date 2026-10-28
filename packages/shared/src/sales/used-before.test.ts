import { describe, expect, it } from 'vitest';
import { usedBeforeMax, usedBeforeProblem } from './start-date.js';

// Owner 2026-10-28: «i need a way to add number of used lessons if start date switch is on».
const base = { startsOn: '2026-10-27', today: '2026-10-28', canSet: true, lessonsTotal: 8 };

describe('usedBeforeProblem', () => {
  it('0 is always accepted, whatever the start or permission', () => {
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 0, canSet: false, startsOn: base.today })).toBeNull();
  });

  it('1..7 of 8 with a past start and the permission', () => {
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 1 })).toBeNull();
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 7 })).toBeNull();
  });

  it('never the whole package', () => {
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 8 })).toBe('used_before_too_many');
  });

  it('needs a start before today', () => {
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 1, startsOn: base.today })).toBe('used_before_needs_past_start');
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 1, startsOn: '2026-11-01' })).toBe('used_before_needs_past_start');
  });

  it('needs subscriptions.set_start_date', () => {
    expect(usedBeforeProblem({ ...base, lessonsUsedBefore: 1, canSet: false })).toBe('used_before_not_allowed');
  });
});

describe('usedBeforeMax', () => {
  it('every lesson but one', () => {
    expect(usedBeforeMax(8)).toBe(7);
    expect(usedBeforeMax(1)).toBe(0);
    expect(usedBeforeMax(0)).toBe(0);
  });
});
