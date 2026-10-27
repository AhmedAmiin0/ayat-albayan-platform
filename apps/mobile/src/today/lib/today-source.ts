import type { UseQueryResult } from '@tanstack/react-query';
import type { TodayLesson } from './today-lesson';

/** What «اليوم» reads of a day's query: its lessons and how the fetch went. */
export type DayQuery<L extends TodayLesson> = Pick<
  UseQueryResult<L[]>,
  'data' | 'isError' | 'isPending' | 'isRefetching' | 'dataUpdatedAt' | 'refetch'
>;

/**
 * Where a tree's «اليوم» takes its day (docs/29): the admin's GET /lessons/day, or the lessons the
 * salesperson's «جدول الحلقات» shows (GET /sales/schedule, never more). `useDay` is a hook, called
 * for today and, on a quiet day, for tomorrow; `schedule` is the tree's schedule tab («جدول الغد»).
 */
export interface TodaySource<L extends TodayLesson> {
  tree: 'admin' | 'sales';
  useDay: (now: Date) => DayQuery<L>;
  schedule: '/schedule' | '/sales/schedule';
}
