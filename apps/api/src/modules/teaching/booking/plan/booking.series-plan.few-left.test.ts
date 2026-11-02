import { courseLessonCount } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { plannedCourseEnd } from '@/modules/teaching/booking/core/booking.course-end';
import { planSeries, type SeriesRule } from './booking.series-plan';

// Owner 2026-11-02 «dont put limit»: «حلقات مستخدمة من الباقة» may leave fewer lessons than
// days a week. The course books exactly the remaining lessons on the next matching days and ends
// after them; every picked day keeps its rule (the later ones empty).
const now = new Date('2026-10-01T08:00:00Z'); // Thu 11:00 Riyadh
const base: SeriesRule = {
  byday: [0, 2],
  startTimeLocal: '17:00',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-01',
  single: false,
};
const book = (rule: SeriesRule, sub: { lessons_total: number; lessons_used_before: number }) => {
  const endsOn = plannedCourseEnd({ rule, now, lessonsTotal: courseLessonCount(sub) });
  const plans = planSeries({ rule, now, horizonWeeks: 5, endsOn });
  const starts = plans.flatMap((p) => p.occurrences.map((o) => o.starts_at.toISOString()));
  return { endsOn, starts, plans };
};

describe('a course with fewer lessons left than days a week', () => {
  it('8 lessons, 7 used, Sun 17:00 + Tue 19:30 → 1 lesson, Sun 4 Oct, the course ends that day', () => {
    const r = book(base, { lessons_total: 8, lessons_used_before: 7 });
    expect(r.endsOn).toBe('2026-10-04');
    expect(r.starts).toEqual(['2026-10-04T14:00:00.000Z']);
    expect(r.plans.map((p) => [p.timing.ends_on, p.occurrences.length])).toEqual([
      ['2026-10-04', 1],
      ['2026-10-04', 0],
    ]);
  });

  it('12 lessons, 11 used, 3 days a week at three times → 1 lesson on the next matching day', () => {
    const rule: SeriesRule = {
      ...base,
      byday: [0, 2, 4],
      dayTimes: [
        { weekday: 2, startTimeLocal: '19:30' },
        { weekday: 4, startTimeLocal: '20:00' },
      ],
    };
    const r = book(rule, { lessons_total: 12, lessons_used_before: 11 });
    // Thu 1 Oct 20:00 is still ahead of 11:00: the next matching day is today.
    expect(r.starts).toEqual(['2026-10-01T17:00:00.000Z']);
    expect(r.endsOn).toBe('2026-10-01');
    expect(r.plans.map((p) => p.timing.byday)).toEqual([[4], [0], [2]]);
  });

  it('8 lessons, 7 used, both days at one time → 1 lesson (one rule, cut at its first day)', () => {
    const r = book({ ...base, dayTimes: undefined }, { lessons_total: 8, lessons_used_before: 7 });
    expect(r.starts).toEqual(['2026-10-04T14:00:00.000Z']);
  });

  it('unchanged for the normal cases: 8 of 8 → 8 lessons, 6 used of 8 → 2 lessons on both days', () => {
    expect(book(base, { lessons_total: 8, lessons_used_before: 0 }).starts).toHaveLength(8);
    const two = book(base, { lessons_total: 8, lessons_used_before: 6 });
    expect(two.starts).toEqual(['2026-10-04T14:00:00.000Z', '2026-10-06T16:30:00.000Z']);
    expect(two.plans).toHaveLength(2);
  });
});
