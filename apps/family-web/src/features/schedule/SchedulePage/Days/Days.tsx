import { QueryState } from '@ab/web-kit';
import type { Week } from '@/features/schedule/use-week';
import { WeekBody } from '@/features/schedule/WeekBody';

/** The week once the lessons are in (the kit's skeleton and retry until then). */
export function Days({ week, guardian }: { week: Week; guardian: boolean }) {
  const query = {
    data: week.loading || week.failed ? undefined : week.days,
    isError: week.failed,
    refetch: week.retry,
  };
  return (
    <QueryState query={query} rows={3}>
      {(days) => <WeekBody key={week.offset} week={week} days={days} guardian={guardian} />}
    </QueryState>
  );
}
