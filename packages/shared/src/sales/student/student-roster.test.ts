import { describe, expect, it } from 'vitest';
import { rosterAttendance, scheduleGroups, scheduleLine, type RosterSlot } from './student-roster.js';

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const asma = { display_name_ar: 'أسماء حسين', display_name_en: 'Asma Hussein' };
const words = {
  weekday: (d: number) => DAYS[d] ?? '',
  clock: (hhmm: string) => `[${hhmm}]`,
  teacher: (t: { display_name_ar: string }) => t.display_name_ar,
  daySep: '، ',
  groupSep: '؛ ',
};

// 2026-11-01 is a Sunday; 08:00Z is 11:00 in Riyadh, 10:00 in Cairo (UTC+2), 03:00 in New York.
const sunTueThu: RosterSlot = {
  next: ['2026-11-05T08:00:00Z', '2026-11-01T08:00:00Z', '2026-11-03T08:00:00Z'],
  teacher: asma,
};

describe('scheduleLine', () => {
  it('reads the days in week order, the time and the teacher in the viewer zone', () => {
    expect(scheduleLine([sunTueThu], 'Asia/Riyadh', words)).toBe(
      'الأحد، الثلاثاء، الخميس · [11:00] · أسماء حسين',
    );
    expect(scheduleLine([sunTueThu], 'Africa/Cairo', words)).toBe(
      'الأحد، الثلاثاء، الخميس · [10:00] · أسماء حسين',
    );
  });

  it('moves a day across midnight when the viewer zone does', () => {
    const late: RosterSlot = { next: ['2026-11-01T22:30:00Z'], teacher: null };
    expect(scheduleLine([late], 'Asia/Riyadh', words)).toBe('الاثنين · [01:30]');
    expect(scheduleLine([late], 'UTC', words)).toBe('الأحد · [22:30]');
  });

  it('is null without a weekly slot', () => {
    expect(scheduleLine([], 'Asia/Riyadh', words)).toBeNull();
    expect(scheduleLine([{ next: [], teacher: asma }], 'Asia/Riyadh', words)).toBeNull();
  });

  it('joins groups of different times, Saturday first', () => {
    const sat: RosterSlot = { next: ['2026-11-07T15:00:00Z'], teacher: asma };
    expect(scheduleLine([sunTueThu, sat], 'Asia/Riyadh', words)).toBe(
      'السبت · [18:00] · أسماء حسين؛ الأحد، الثلاثاء، الخميس · [11:00] · أسماء حسين',
    );
  });
});

describe('scheduleGroups', () => {
  it('merges two slots of one time and teacher, keeps two teachers apart', () => {
    const mon: RosterSlot = { next: ['2026-11-02T08:00:00Z'], teacher: asma };
    const other: RosterSlot = { next: ['2026-11-02T08:00:00Z'], teacher: { display_name_ar: 'هدى', display_name_en: null } };
    const groups = scheduleGroups([sunTueThu, mon, other], 'Asia/Riyadh');
    expect(groups.map((g) => [g.days, g.time, g.teacher?.display_name_ar])).toEqual([
      [[0, 1, 2, 4], '11:00', 'أسماء حسين'],
      [[1], '11:00', 'هدى'],
    ]);
  });

  it('lists a repeated weekday once', () => {
    const twice: RosterSlot = { next: ['2026-11-01T08:00:00Z', '2026-11-08T08:00:00Z'], teacher: null };
    expect(scheduleGroups([twice], 'Asia/Riyadh')[0]?.days).toEqual([0]);
  });
});

describe('rosterAttendance', () => {
  it('counts present out of present + absent, as «سجل الحضور» does', () => {
    const kinds = ['present', 'present', 'absent', 'excused', 'cancelled', 'unmarked', null] as const;
    expect(rosterAttendance(kinds, 'subscription')).toEqual({ attended: 2, held: 3, basis: 'subscription' });
  });

  it('is zero of zero without a held lesson', () => {
    expect(rosterAttendance([], 'recent')).toEqual({ attended: 0, held: 0, basis: 'recent' });
  });
});
