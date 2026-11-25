import type { PortalLesson, PortalStudent } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { weekSchedule, weekStrip, weekSummary } from './week-schedule';

const student: PortalStudent = {
  id: 'a', code: 'AB-0001', name: 'a', tz: 'Asia/Riyadh', contact_is_self: false,
};
const teacher = (name: string) => ({ display_name_ar: name, display_name_en: null });
const lesson = (id: string, startsAt: string, over: Partial<PortalLesson> = {}): PortalLesson => {
  const ends = new Date(Date.parse(startsAt) + 45 * 60_000).toISOString();
  return {
    id, starts_at: startsAt, ends_at: ends, status: 'confirmed', teacher: teacher('فاطمة'),
    way_in: 'classroom', meeting_url: null,
    window: { state: 'early', opens_at: startsAt, closes_at: ends },
    ...over,
  };
};
const open = { counts: false, group: false, request: null };
// Wednesday 2026-11-11, 09:00 in Riyadh: the academy week runs Sat 7 → Fri 13.
const now = new Date('2026-11-11T06:00:00.000Z');
const tz = 'Asia/Riyadh';
const lessons = [
  lesson('a1', '2026-11-11T15:30:00.000Z', { status: 'scheduled', family: open }),
  lesson('a2', '2026-11-11T17:30:00.000Z', { teacher: teacher('مريم') }),
  lesson('a3', '2026-11-13T15:30:00.000Z', { status: 'scheduled' }),
  lesson('a4', '2026-11-15T15:30:00.000Z'),
];
const input = (offset: number) => ({ children: [{ student, lessons }], tz, offset });

describe('weekStrip', () => {
  it('lists the seven days Saturday first, today marked, each with its lessons ahead', () => {
    expect(weekStrip(input(0), now)).toEqual([
      { day: '2026-11-07', today: false, count: 0 },
      { day: '2026-11-08', today: false, count: 0 },
      { day: '2026-11-09', today: false, count: 0 },
      { day: '2026-11-10', today: false, count: 0 },
      { day: '2026-11-11', today: true, count: 2 },
      { day: '2026-11-12', today: false, count: 0 },
      { day: '2026-11-13', today: false, count: 1 },
    ]);
  });

  it('a later week has no today', () => {
    const strip = weekStrip(input(1), now);
    expect(strip.map((d) => d.day)).toEqual([
      '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17',
      '2026-11-18', '2026-11-19', '2026-11-20',
    ]);
    expect(strip.some((d) => d.today)).toBe(false);
    expect(strip[1]?.count).toBe(1);
  });
});

describe('weekSummary', () => {
  it('counts the lessons, those awaiting «سأحضر», and each teacher once', () => {
    const summary = weekSummary(weekSchedule(input(0), now), now);
    expect(summary.lessons).toBe(3);
    // a1 is the family's own and still scheduled; a3 comes from an older API (no `family`).
    expect(summary.awaiting).toBe(1);
    expect(summary.teachers.map((x) => x.display_name_ar)).toEqual(['فاطمة', 'مريم']);
  });

  it('an empty week', () => {
    expect(weekSummary([], now)).toEqual({ lessons: 0, awaiting: 0, teachers: [] });
  });
});
