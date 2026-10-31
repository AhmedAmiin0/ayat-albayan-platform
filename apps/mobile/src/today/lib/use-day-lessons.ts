import { RIYADH_TZ, type LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { localDate } from './timeline';

/**
 * GET /lessons/day for today in Riyadh (docs/10 route 2), every teacher. Academy day (docs/34 b):
 * the same day as the schedule's `date` param; times inside read in the viewer's zone. Key
 * ['lessons', 'day', { date, tz }], so the lesson actions' optimistic patch and refetch reach it,
 * and the app's persisted cache keeps it for an offline start (R-MOB-03). The date is taken from
 * `now`, so the screen moves to the new day at midnight.
 */
export function useDayLessons(now: Date) {
  const params = { date: localDate(now, RIYADH_TZ), tz: RIYADH_TZ };
  return useQuery({
    queryKey: [...pathKey('/lessons/day'), params],
    queryFn: () => apiFetch<LessonView[]>(`/lessons/day${toQueryString(params)}`),
  });
}
