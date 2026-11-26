import { EmptyState, ErrorState, SkeletonCard, t } from '@ab/mobile-kit';
import { ScheduleDay } from '@/schedule/ScheduleDay';
import type { WeekBodyProps } from './WeekBody.types';
import { faceOf } from './week-body.helpers';

/** The week's days, or a skeleton, the retry, the «no lessons this week» note. */
export function WeekBody({ week }: WeekBodyProps) {
  const face = faceOf(week);
  if (face === 'loading') return <SkeletonCard />;
  if (face === 'failed') return <ErrorState onRetry={week.retry} />;
  if (face === 'empty') return <EmptyState title={t.portal.app.schedule.empty} />;
  return week.days.map((d) => (
    <ScheduleDay key={d.day} day={d} clock={week.clock} now={week.now} />
  ));
}
