import { describe, expect, it } from 'vitest';
import {
  startDateEditMax,
  startDateEditMin,
  startDateEditProblem,
  startDateEditSchema,
} from './start-date-edit.js';

const TODAY = '2026-11-03';
const base = { next: '2026-10-01', today: TODAY, cancelled: false, lessonsUsedBefore: 0 };

describe('startDateEditProblem', () => {
  it('accepts a past day up to a year back, today and a future day', () => {
    for (const next of ['2025-11-03', '2026-10-01', TODAY, '2027-01-01']) {
      expect(startDateEditProblem({ ...base, next })).toBeNull();
    }
  });

  it('refuses more than a year back (the create bound)', () => {
    expect(startDateEditProblem({ ...base, next: '2025-11-02' })).toBe('start_date_too_old');
  });

  it('with lessons counted before: today or later is used_before_needs_past_start', () => {
    const counted = { ...base, lessonsUsedBefore: 2 };
    expect(startDateEditProblem({ ...counted, next: TODAY })).toBe('used_before_needs_past_start');
    expect(startDateEditProblem({ ...counted, next: '2027-01-01' })).toBe(
      'used_before_needs_past_start',
    );
    expect(startDateEditProblem({ ...counted, next: '2026-11-02' })).toBeNull();
  });

  it('a cancelled package first', () => {
    const cancelled = { ...base, cancelled: true, next: '2020-01-01' };
    expect(startDateEditProblem(cancelled)).toBe('already_cancelled');
  });
});

describe('the bounds', () => {
  it('min a year back; max yesterday only with lessons counted before', () => {
    expect(startDateEditMin(TODAY)).toBe('2025-11-03');
    expect(startDateEditMax({ today: TODAY, lessonsUsedBefore: 1 })).toBe('2026-11-02');
    expect(startDateEditMax({ today: TODAY, lessonsUsedBefore: 0 })).toBeUndefined();
  });
});

describe('startDateEditSchema', () => {
  it('a strict ISO day only', () => {
    expect(startDateEditSchema.safeParse({ startsOn: TODAY }).success).toBe(true);
    expect(startDateEditSchema.safeParse({ startsOn: '03/11/2026' }).success).toBe(false);
    expect(startDateEditSchema.safeParse({ startsOn: TODAY, renewsOn: TODAY }).success).toBe(false);
  });
});
