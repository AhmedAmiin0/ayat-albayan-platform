import type { UseQueryResult } from '@tanstack/react-query';
import type { TodayLesson } from './today-lesson';

export type DayQuery<L extends TodayLesson> = Pick<
  UseQueryResult<L[]>,
  'data' | 'isError' | 'isPending' | 'isRefetching' | 'dataUpdatedAt' | 'refetch'
>;

/** Admin day or the sales schedule's lessons (docs/29); `useDay` runs for today and tomorrow. */
export interface TodaySource<L extends TodayLesson> {
  tree: 'admin' | 'sales';
  useDay: (now: Date) => DayQuery<L>;
  schedule: '/schedule' | '/sales/schedule';
}
