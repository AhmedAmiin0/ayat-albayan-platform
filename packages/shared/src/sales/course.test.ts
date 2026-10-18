import { describe, expect, it } from 'vitest';
import { courseBodyPackage, courseDaysPerWeek } from './course.js';

describe('courseDaysPerWeek', () => {
  it.each([
    ['4', 1],
    ['8', 2],
    ['12', 3],
    ['16', 4],
    ['20', 5],
    ['28', 7],
  ] as const)('package %s → %i days a week', (pkg, n) => {
    expect(courseDaysPerWeek({ package: pkg, lessons_total: Number(pkg) })).toBe(n);
  });
  it('a custom count divisible by 4 → lessons / 4', () => {
    expect(courseDaysPerWeek({ package: null, lessons_total: 24 })).toBe(6);
  });
  it('a custom count the admin books (not by 4, or more than 7 a week)', () => {
    expect(courseDaysPerWeek({ package: null, lessons_total: 10 })).toBeNull();
    expect(courseDaysPerWeek({ package: null, lessons_total: 32 })).toBeNull();
  });
});

describe('courseBodyPackage', () => {
  it('the subscription’s package, or a paid size the schema accepts for a custom count', () => {
    expect(courseBodyPackage({ package: '12' })).toBe('12');
    expect(courseBodyPackage({ package: null })).toBe('8');
  });
});
