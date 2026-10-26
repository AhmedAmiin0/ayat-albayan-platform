import type { PendingReportView } from '@ab/shared';
import { lesson } from '@/today/testing/fixtures';
import { dayWindow, lessonsOn, reportAction } from './day';

const CAIRO = 'Africa/Cairo';

test('dayWindow holds the whole day in every zone and is stable for the day', () => {
  expect(dayWindow('2026-10-01')).toEqual({ from: '2026-09-30T10:00:00.000Z', to: '2026-10-02T12:00:00.000Z' });
});

test('lessonsOn keeps the lessons starting on that day in the teacher’s zone, earliest first', () => {
  // 21:30Z on 30 Sep is 00:30 on 1 Oct in Cairo (UTC+3 in summer time) but still 30 Sep in UTC.
  const late = lesson({ id: 'late', starts_at: '2026-10-01T18:00:00.000Z' });
  const early = lesson({ id: 'early', starts_at: '2026-09-30T21:30:00.000Z' });
  const yesterday = lesson({ id: 'y', starts_at: '2026-09-30T20:00:00.000Z' });
  const moved = lesson({ id: 'moved', status: 'rescheduled' });
  const cancelled = lesson({ id: 'c', status: 'cancelled_by_teacher' });
  const excused = lesson({ id: 'ex', status: 'excused' });
  const ids = lessonsOn([late, yesterday, moved, early, cancelled, excused], '2026-10-01', CAIRO).map((l) => l.id);
  expect(ids).toEqual(['early', 'ex', 'late']);
});

const started = lesson({ id: 'l1', starts_at: '2026-10-01T13:00:00.000Z' });
const now = new Date('2026-10-01T14:00:00Z');
const row = (reportId: string | null): PendingReportView => ({
  lesson_id: 'l1',
  starts_at: started.starts_at,
  status: 'scheduled',
  student: { id: 's1', code: 'AB-0182', name: 'يوسف أحمد' },
  report_id: reportId,
});

test('reportAction: nothing before the start or for a cancelled lesson', () => {
  expect(reportAction(started, [], new Date('2026-10-01T12:59:00Z'))).toBeNull();
  expect(reportAction({ ...started, status: 'cancelled_by_admin' }, [], now)).toBeNull();
});

test('reportAction: write while pending (edit once a draft exists), else read', () => {
  expect(reportAction(started, [row(null)], now)).toBe('open');
  expect(reportAction(started, [row('r1')], now)).toBe('edit');
  expect(reportAction(started, [], now)).toBe('view');
  expect(reportAction(started, undefined, now)).toBe('open');
});
