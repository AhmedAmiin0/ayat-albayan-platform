import type { ReactNode } from 'react';
import { EmptyState, ErrorState, SkeletonCard, t } from '@ab/mobile-kit';
import { ScheduleDay } from './ScheduleDay';
import type { Week } from './use-week';

type Face = 'loading' | 'failed' | 'empty' | 'days';

function faceOf(week: Week): Face {
  if (week.failed) return 'failed';
  if (week.loading) return 'loading';
  return week.days.length === 0 ? 'empty' : 'days';
}

const FACE: Record<Face, (week: Week) => ReactNode> = {
  loading: () => <SkeletonCard />,
  failed: (week) => <ErrorState onRetry={week.retry} />,
  empty: () => <EmptyState title={t.portal.app.schedule.empty} />,
  days: (week) =>
    week.days.map((d) => (
      <ScheduleDay key={d.day} day={d} clock={week.clock} now={week.now} />
    )),
};

/** The week's days, or a skeleton, the retry, the «no lessons this week» note. */
export function WeekBody({ week }: { week: Week }) {
  return FACE[faceOf(week)](week);
}
