import { describe, expect, it } from 'vitest';
import { TEACHER_ID } from '../lessons.fakes';
import { toOverview } from './overview.mapper';

// Riyadh Sunday 2026-10-04 from 00:00 (21:00Z). Abrar's window is 22:00-24:00 Cairo summer time
// (19:00Z-21:00Z); a lesson that began before the window start and runs 20 minutes into it.
const window = { from: new Date('2026-10-04T19:20:00Z'), to: new Date('2026-10-04T21:00:00Z') };
const teacher = {
  ...{ id: TEACHER_ID, display_name_ar: 'أبرار', display_name_en: null, gender: 'female' as const },
  ...{ programs: ['quran' as const], tz: 'Africa/Cairo', meeting_link: null, max_students: 12, status: 'active' as const },
};
const slots = [{ teacher_id: TEACHER_ID, weekday: 0, start_time: '22:00:00', end_time: '23:59:00', tz: 'Africa/Cairo' }];
const base = { window, teachers: [teacher], slots, timeOff: [], loads: new Map(), lessons: [] };
const carry = (status: 'scheduled' | 'cancelled_by_admin') => [
  { teacher_id: TEACHER_ID, status, starts_at: '2026-10-04T18:45:00+00:00', ends_at: '2026-10-04T19:30:00+00:00' },
];

describe('toOverview: a lesson that started before the window and runs into it', () => {
  it('blocks the free time it still occupies, without appearing in the lessons list', () => {
    const out = toOverview({ ...base, carry: carry('scheduled') });
    expect(out.teachers[0]?.free[0]?.starts_at).toBe('2026-10-04T19:30:00.000Z');
    expect(out.lessons).toEqual([]);
  });

  it('a cancelled one frees its time', () => {
    const out = toOverview({ ...base, carry: carry('cancelled_by_admin') });
    expect(out.teachers[0]?.free[0]?.starts_at).toBe('2026-10-04T19:20:00.000Z');
  });
});
