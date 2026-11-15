import { describe, expect, it } from 'vitest';
import { isLiveNow, todayCounts, todaysLessons } from './today';
import { lessonAt } from './today-fixture';

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('today (dashboard)', () => {
  const late = lessonAt({ id: 'late', startsAt: '2026-10-05T15:00:00.000Z' });
  const live = lessonAt({ id: 'live', startsAt: '2026-10-05T09:50:00.000Z' });
  const gone = lessonAt({ id: 'gone', startsAt: '2026-10-05T11:00:00.000Z', status: 'cancelled_by_admin' });
  const lessons = [late, live, gone];

  it('keeps the lessons that still happen, earliest first', () => {
    expect(todaysLessons(lessons).map((l) => l.id)).toEqual(['live', 'late']);
  });

  it('a lesson is live while its join window is open', () => {
    expect(isLiveNow(live, NOW)).toBe(true);
    expect(isLiveNow(late, NOW)).toBe(false);
  });

  it('counts today and live; nothing while loading', () => {
    expect(todayCounts(lessons, NOW)).toEqual({ lessons: 2, live: 1 });
    expect(todayCounts(undefined, NOW)).toBeUndefined();
    expect(todayCounts([], NOW)).toEqual({ lessons: 0, live: 0 });
  });
});
