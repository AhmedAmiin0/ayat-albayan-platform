import type { PortalReport, PortalStudent } from '@ab/shared';

export interface ReportMonthsProps {
  reports: readonly PortalReport[];
  student: PortalStudent;
}
