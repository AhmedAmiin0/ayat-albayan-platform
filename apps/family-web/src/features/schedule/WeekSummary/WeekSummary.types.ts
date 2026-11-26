import type { WeekSummary as Summary } from '@ab/client-core';

export interface WeekSummaryProps {
  summary: Summary;
  /** Only a guardian confirms lessons, so only a guardian sees what waits. */
  guardian: boolean;
}
