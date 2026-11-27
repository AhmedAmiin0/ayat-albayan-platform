import type { PortalHistory, PortalHistoryStatus, PortalStudent } from '@ab/shared';

export interface HistoryMonthsProps {
  pages: readonly PortalHistory[];
  student: PortalStudent;
  status: PortalHistoryStatus;
}
