import { describe, expect, it } from 'vitest';
import { usedBeforeEditMax, usedBeforeEditProblem, usedBeforeEditSchema } from './used-before-edit.js';

// Owner 2026-11-02: «i want the ability to change the number of attended sessions as assistant».
const base = { next: 3, lessonsTotal: 8, platformUsed: 0, cancelled: false, courseBooked: false };

describe('usedBeforeEditMax', () => {
  it('is usedBeforeMax for an untouched package (8 lessons, 2 days a week: 6)', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 0 })).toBe(6);
    expect(usedBeforeEditMax({ lessonsTotal: 12, platformUsed: 0 })).toBe(9);
  });

  it('never more than the lessons still free after the platform ones', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 5 })).toBe(3);
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: 9 })).toBe(0);
  });

  it('ignores a negative platform count (never widens the bound)', () => {
    expect(usedBeforeEditMax({ lessonsTotal: 8, platformUsed: -2 })).toBe(6);
  });
});

describe('usedBeforeEditProblem', () => {
  it('accepts 0..max on a package without a course', () => {
    expect(usedBeforeEditProblem({ ...base, next: 0 })).toBeNull();
    expect(usedBeforeEditProblem({ ...base, next: 6 })).toBeNull();
  });

  it('refuses more than the max: never the whole package', () => {
    expect(usedBeforeEditProblem({ ...base, next: 7 })).toBe('used_before_too_many');
    expect(usedBeforeEditProblem({ ...base, next: 8 })).toBe('used_before_too_many');
    expect(usedBeforeEditProblem({ ...base, next: 4, platformUsed: 5 })).toBe('used_before_too_many');
  });

  it('refuses a cancelled package first, then a booked course', () => {
    expect(usedBeforeEditProblem({ ...base, cancelled: true, courseBooked: true })).toBe('already_cancelled');
    expect(usedBeforeEditProblem({ ...base, next: 0, courseBooked: true })).toBe('used_before_course_booked');
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
