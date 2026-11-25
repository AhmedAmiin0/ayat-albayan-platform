import type { PortalLesson, PortalStudent } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { scheduleWeek, weekSchedule } from './week-schedule';

const student = (id: string): PortalStudent => ({
  id, code: `AB-${id}`, name: id, tz: 'Asia/Riyadh', contact_is_self: false,
});
const lesson = (id: string, startsAt: string, over: Partial<PortalLesson> = {}): PortalLesson => {
  const ends = new Date(Date.parse(startsAt) + 45 * 60_000).toISOString();
  return {
    id, starts_at: startsAt, ends_at: ends, status: 'confirmed',
    teacher: { display_name_ar: 'فاطمة', display_name_en: null }, way_in: 'classroom',
    meeting_url: null,
    window: { state: 'early', opens_at: startsAt, closes_at: ends },
    ...over,
  };
};
// Wednesday 2026-11-11, 09:00 in Riyadh: the academy week runs Sat 7 → Fri 13.
const now = new Date('2026-11-11T06:00:00.000Z');
const tz = 'Asia/Riyadh';

describe('scheduleWeek', () => {
  it('runs Saturday to Friday on the viewer clock, offset by whole weeks', () => {
    expect(scheduleWeek(now, tz, 0)).toEqual({ from: '2026-11-07', to: '2026-11-13' });
    expect(scheduleWeek(now, tz, 1)).toEqual({ from: '2026-11-14', to: '2026-11-20' });
  });
});

describe('weekSchedule', () => {
  const a = student('a');
  const b = student('b');
  const children = [
    { student: a, lessons: [lesson('a1', '2026-11-12T15:30:00.000Z'), lesson('a2', '2026-11-15T15:30:00.000Z')] },
    {
      student: b,
      lessons: [
        lesson('b1', '2026-11-12T14:00:00.000Z'),
        lesson('b2', '2026-11-13T14:00:00.000Z', { status: 'cancelled_by_teacher' }),
        lesson('b3', '2026-11-10T14:00:00.000Z'),
      ],
    },
  ];

  it('merges the children by day and start, ahead and not cancelled only', () => {
    const days = weekSchedule({ children, tz, offset: 0 }, now);
    expect(days.map((d) => [d.day, d.lessons.map((l) => l.lesson.id)])).toEqual([
      ['2026-11-12', ['b1', 'a1']],
    ]);
    expect(days[0]?.lessons[0]?.student.id).toBe('b');
  });

  it('next week holds the later lessons; no child, no days', () => {
    const next = weekSchedule({ children, tz, offset: 1 }, now);
    expect(next.map((d) => d.day)).toEqual(['2026-11-15']);
    expect(weekSchedule({ children: [], tz, offset: 0 }, now)).toEqual([]);
  });
});
