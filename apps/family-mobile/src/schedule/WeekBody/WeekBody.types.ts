import type { Week } from '@/schedule/use-week';

export interface WeekBodyProps {
  week: Week;
}

export type Face = 'loading' | 'failed' | 'empty' | 'days';
