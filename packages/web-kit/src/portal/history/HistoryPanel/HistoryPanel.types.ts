import type { PortalHistoryStatus, PortalStudent } from '@ab/shared';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

export interface Props {
  student: PortalStudent;
  status: PortalHistoryStatus;
  onOpenReport: (report: OpenReport) => void;
  /** The family web's lesson page; staff pages have none. */
  onOpenLesson?: (lessonId: string) => void;
}
