import type { WeekDay } from '@ab/client-core';

export interface AgendaDayProps {
  day: WeekDay;
  today: boolean;
  guardian: boolean;
}
