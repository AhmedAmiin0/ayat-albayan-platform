import { useJumpToDay } from '@/features/schedule/strip';
import type { WeekBodyProps } from './WeekBody.types';

export function useWeekBody({ week }: Pick<WeekBodyProps, 'week'>) {
  const jump = useJumpToDay();
  const today = week.strip.find((d) => d.today)?.day;
  return { jump, today };
}
