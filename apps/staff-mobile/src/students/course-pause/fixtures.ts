import type { CoursePauseResult, CoursePauseState, CoursePauseView } from '@ab/shared';

// «إيقاف مؤقت» as the API answers it (tests only). «Today» in these tests is Wednesday 28 October 2026 (Riyadh).

export const TODAY = '2026-10-28';
export const NOW = new Date('2026-10-28T09:00:00.000Z');

export const pauseView = (over: Partial<CoursePauseView> = {}): CoursePauseView => ({
  id: 'p1',
  from_date: TODAY,
  until_date: '2026-11-10',
  reason: 'سفر الأسرة',
  created_at: '2026-10-28T08:00:00.000Z',
  created_by_name: 'سارة',
  resumed_at: null,
  extended_days: null,
  ...over,
});

export const pauseState = (open: CoursePauseView | null = null): CoursePauseState => ({ open, history: [] });

export const pauseResult = (over: Partial<CoursePauseResult> = {}): CoursePauseResult => ({
  pause: pauseView(),
  cancelled: 3,
  left: 0,
  reopened: 0,
  conflicts: 0,
  ...over,
});
