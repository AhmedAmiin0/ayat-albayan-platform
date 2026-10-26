import { cancelled, done, lesson, muscat, pending } from '../testing/fixtures';
import { applyFilter, filterCounts, localDate, visibleLessons } from './timeline';

const at = (iso: string) => new Date(iso);

test('closed rows (cancelled, rescheduled, excused) are hidden; the rest sort by start', () => {
  const moved = lesson({ id: 'l-moved', status: 'rescheduled' });
  const excused = lesson({ id: 'l-excused', status: 'excused' });
  const byTeacher = lesson({ id: 'l-t', status: 'cancelled_by_teacher' });
  const out = visibleLessons([muscat, cancelled, pending, moved, done, excused, byTeacher]);
  expect(out.map((l) => l.id)).toEqual(['l-done', 'l-pending', 'l-muscat']);
});

test('summary counts come from the returned day; confirmed, late and no-show only count under all', () => {
  const late = lesson({ id: 'l-late', status: 'late' });
  const noShow = lesson({ id: 'l-ns', status: 'no_show' });
  expect(filterCounts([done, pending, muscat, late, noShow])).toEqual({
    all: 5,
    scheduled: 1,
    completed: 1,
  });
  expect(filterCounts([])).toEqual({ all: 0, scheduled: 0, completed: 0 });
});

test('a status filter keeps only that status; الكل keeps everything', () => {
  const day = [done, pending, muscat];
  expect(applyFilter(day, 'all')).toEqual(day);
  expect(applyFilter(day, 'scheduled')).toEqual([pending]);
  expect(applyFilter(day, 'completed')).toEqual([done]);
});

test('the request date is the local day in the given zone, not UTC', () => {
  // 22:30 UTC on 30 Sep is already 1 Oct in Riyadh, still 30 Sep in Cairo (UTC+3 in DST 2026).
  expect(localDate(at('2026-09-30T22:30:00Z'), 'Asia/Riyadh')).toBe('2026-10-01');
  expect(localDate(at('2026-09-30T20:30:00Z'), 'Africa/Cairo')).toBe('2026-09-30');
  expect(localDate(at('2026-01-05T08:00:00Z'), 'Asia/Riyadh')).toBe('2026-01-05');
});
