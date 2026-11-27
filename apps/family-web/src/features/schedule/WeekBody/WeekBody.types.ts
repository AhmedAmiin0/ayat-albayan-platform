import type { WeekDay } from '@ab/client-core';
import type { Week } from '@/features/schedule/use-week';

export interface WeekBodyProps {
  week: Week;
  days: WeekDay[];
  guardian: boolean;
}
