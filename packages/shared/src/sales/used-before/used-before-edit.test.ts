import { describe, expect, it } from 'vitest';
import {
  usedBeforeEditMax,
  usedBeforeEditOffered,
  usedBeforeEditProblem,
  usedBeforeEditSchema,
} from './used-before-edit.js';

// Owner 2026-11-02: «i want the ability to change the number of attended sessions as assistant».
const base = {
  next: 3, lessonsTotal: 8, platformUsed: 0, cancelled: false, courseBooked: false, pastStart: true,
};

describe('usedBeforeEditMax', () => {
  it('is usedBeforeMax for an untouched package (every lesson but one: 8 → 7)', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 0, pastStart: true })).toBe(7);
    expect(usedBeforeEditMax({ lessonsTotal: 12, platformUsed: 0, pastStart: true })).toBe(11);
  });

  it('never more than the lessons still free after the platform ones', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 5, pastStart: true })).toBe(3);
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 9, pastStart: true })).toBe(0);
  });

  it('ignores a negative platform count (never widens the bound)', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: -2, pastStart: true })).toBe(7);
  });
});

describe('usedBeforeEditProblem', () => {
  it('accepts 0..max on a package without a course', () => {
    expect(usedBeforeEditProblem({ ...base, next: 0 })).toBeNull();
    expect(usedBeforeEditProblem({ ...base, next: 7 })).toBeNull();
  });

  it('refuses more than the max: never the whole package', () => {
    expect(usedBeforeEditProblem({ ...base, next: 8 })).toBe('used_before_too_many');
    expect(usedBeforeEditProblem({ ...base, next: 4, platformUsed: 5, pastStart: true })).toBe('used_before_too_many');
  });

  it('refuses a cancelled package first, then a booked course', () => {
    expect(usedBeforeEditProblem({ ...base, cancelled: true, courseBooked: true })).toBe('already_cancelled');
    expect(usedBeforeEditProblem({ ...base, next: 0, courseBooked: true })).toBe('used_before_course_booked');
  });
});

describe('the past start (the create\'s rule, so commission never changes)', () => {
  it('a start today or later: only 0, max 0', () => {
    expect(usedBeforeEditProblem({ ...base, next: 1, pastStart: false })).toBe('used_before_needs_past_start');
    expect(usedBeforeEditProblem({ ...base, next: 0, pastStart: false })).toBeNull();
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 0, pastStart: false })).toBe(0);
  });

  it('offered when not cancelled with a past start or a count to lower', () => {
    expect(usedBeforeEditOffered({ cancelled: false, pastStart: true, current: 0 })).toBe(true);
    expect(usedBeforeEditOffered({ cancelled: false, pastStart: false, current: 2 })).toBe(true);
    expect(usedBeforeEditOffered({ cancelled: false, pastStart: false, current: 0 })).toBe(false);
    expect(usedBeforeEditOffered({ cancelled: true, pastStart: true, current: 2 })).toBe(false);
  });
});

describe('usedBeforeEditSchema', () => {
  it('takes one whole number, nothing else', () => {
    expect(usedBeforeEditSchema.parse({ lessonsUsedBefore: 2 })).toEqual({ lessonsUsedBefore: 2 });
    expect(usedBeforeEditSchema.safeParse({ lessonsUsedBefore: 1.5 }).success).toBe(false);
    expect(usedBeforeEditSchema.safeParse({ lessonsUsedBefore: -1 }).success).toBe(false);
    expect(usedBeforeEditSchema.safeParse({ lessonsUsedBefore: 1, startsOn: '2026-01-01' }).success).toBe(false);
  });
});
