import { describe, expect, it } from 'vitest';
import { dayExpiry, expiryChip, expiryDay, inPeopleFilter } from './link-choices.js';

const clock = { now: new Date('2026-11-17T22:30:00.000Z'), tz: 'Asia/Riyadh' };

describe('inPeopleFilter', () => {
  it('groups the roles under the chips', () => {
    expect(inPeopleFilter('all', 'whatever')).toBe(true);
    expect(inPeopleFilter('guardians', 'guardian')).toBe(true);
    expect(inPeopleFilter('students', 'student')).toBe(true);
    expect(inPeopleFilter('teachers', 'teacher')).toBe(true);
    expect(inPeopleFilter('staff', 'sales')).toBe(true);
    expect(inPeopleFilter('staff', 'custom-role')).toBe(true);
    expect(inPeopleFilter('teachers', 'guardian')).toBe(false);
  });
});

describe('expiryChip', () => {
  it('lights a day chip or «تاريخ آخر»', () => {
    expect(expiryChip({ kind: 'days', days: 7 })).toBe(7);
    expect(expiryChip({ kind: 'days', days: 9 })).toBe('date');
    expect(expiryChip({ kind: 'date', at: '2026-12-01T00:00:00.000Z' })).toBe('date');
  });
});

describe('dayExpiry / expiryDay', () => {
  it('counts calendar days in the viewer zone (already the 18th in Riyadh)', () => {
    expect(dayExpiry('2026-11-28', clock)).toEqual({ kind: 'days', days: 10 });
    expect(expiryDay({ kind: 'days', days: 10 }, clock)).toBe('2026-11-28');
  });
});
