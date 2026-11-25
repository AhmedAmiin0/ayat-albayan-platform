import { describe, expect, it } from 'vitest';
import {
  dayEndExpiry, expiryChip, expiryDay, expiryDayRange, inPeopleFilter,
} from './link-choices';

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

describe('dayEndExpiry / expiryDay', () => {
  it('ends at 23:59 of the picked day in the viewer zone', () => {
    expect(dayEndExpiry('2026-11-28', 'Asia/Riyadh')).toEqual({
      kind: 'date',
      at: '2026-11-28T20:59:00.000Z',
    });
    expect(dayEndExpiry('2026-11-28', 'UTC')).toEqual({
      kind: 'date',
      at: '2026-11-28T23:59:00.000Z',
    });
  });

  it('reads the calendar day back in the viewer zone (already the 18th in Riyadh)', () => {
    expect(expiryDay(dayEndExpiry('2026-11-28', clock.tz), clock)).toBe('2026-11-28');
    expect(expiryDay({ kind: 'days', days: 10 }, clock)).toBe('2026-11-28');
  });
});

describe('expiryDayRange', () => {
  it('runs from today to the last day the API takes', () => {
    expect(expiryDayRange(clock)).toEqual({ min: '2026-11-18', max: '2027-11-17' });
  });
});
