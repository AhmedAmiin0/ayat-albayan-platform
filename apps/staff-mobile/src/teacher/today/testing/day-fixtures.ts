import type { PendingReportView } from '@ab/shared';
import { jana, lesson, yusuf } from '@/today/testing/fixtures';

// «اليوم» test day (docs/48): 1 Oct 2026 at 14:00Z. Times are UTC instants, so the day holds in
// every zone from UTC to UTC+5.

export const NOW = new Date('2026-10-01T14:00:00Z');

/** 13:00–13:45Z: ended, its report still to write. */
export const held = lesson({
  id: 'held',
  starts_at: '2026-10-01T13:00:00.000Z',
  ends_at: '2026-10-01T13:45:00.000Z',
});
/** 17:00Z, ahead, waiting for her «سأحضر», on her own fixed link: the hero. */
export const later = lesson({
  id: 'later',
  starts_at: '2026-10-01T17:00:00.000Z',
  ends_at: '2026-10-01T17:45:00.000Z',
  meeting_link: 'https://meet.google.com/abc',
  platform_classroom: false,
  students: [jana],
});
/** 18:30Z, ahead: the one «بقية اليوم» row. */
export const evening = lesson({
  id: 'evening',
  starts_at: '2026-10-01T18:30:00.000Z',
  ends_at: '2026-10-01T19:15:00.000Z',
  platform_classroom: false,
  students: [{ ...yusuf, id: 's4', name: 'سلمى علي' }],
});
/** Saturday: the next-lesson pointer on an empty day. */
export const saturday = lesson({
  id: 'sat',
  starts_at: '2026-10-03T09:00:00.000Z',
  ends_at: '2026-10-03T09:45:00.000Z',
  students: [{ ...yusuf, id: 's5', name: 'ريم سالم' }],
});

const pendingHeld: PendingReportView[] = [
  {
    lesson_id: 'held',
    starts_at: held.starts_at,
    status: 'scheduled',
    student: { id: 's1', code: 'AB-0182', name: 'يوسف أحمد' },
    report_id: null,
  },
];

/** The apiFetch answers: her lessons for any window, the pending list, else nothing. */
export function answer(lessons: unknown[], pending: unknown[] = pendingHeld) {
  return async (path: string) => {
    if (path.startsWith('/teachers/me/lessons')) return lessons;
    if (path === '/teachers/me/pending-reports') return pending;
    return [];
  };
}
