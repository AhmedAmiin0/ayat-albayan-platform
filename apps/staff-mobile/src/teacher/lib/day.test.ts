import { lesson } from '@/today/testing/fixtures';
import { aheadWindow, dayWindow, lessonsOn } from './day';

const CAIRO = 'Africa/Cairo';

test('dayWindow holds the whole day in every zone and is stable for the day', () => {
  expect(dayWindow('2026-10-01')).toEqual({
    from: '2026-09-30T10:00:00.000Z',
    to: '2026-10-02T12:00:00.000Z',
  });
});

test('aheadWindow keeps dayWindow’s padded start and reads 15 days on (docs/48)', () => {
  expect(aheadWindow('2026-10-01')).toEqual({
    from: '2026-09-30T10:00:00.000Z',
    to: '2026-10-15T10:00:00.000Z',
  });
});

test('lessonsOn keeps the lessons starting on that day in the teacher’s zone, earliest first', () => {
  // 21:30Z on 30 Sep is 00:30 on 1 Oct in Cairo (UTC+3 in summer time) but still 30 Sep in UTC.
  const late = lesson({ id: 'late', starts_at: '2026-10-01T18:00:00.000Z' });
  const early = lesson({ id: 'early', starts_at: '2026-09-30T21:30:00.000Z' });
  const yesterday = lesson({ id: 'y', starts_at: '2026-09-30T20:00:00.000Z' });
  const moved = lesson({ id: 'moved', status: 'rescheduled' });
  const cancelled = lesson({ id: 'c', status: 'cancelled_by_teacher' });
  const excused = lesson({ id: 'ex', status: 'excused' });
  const all = [late, yesterday, moved, early, cancelled, excused];
  expect(lessonsOn(all, '2026-10-01', CAIRO).map((l) => l.id)).toEqual(['early', 'ex', 'late']);
});
