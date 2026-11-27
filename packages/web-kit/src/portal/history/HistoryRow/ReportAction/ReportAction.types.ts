import type { PortalHistoryRow } from '@ab/shared';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

export interface ReportActionProps {
  row: PortalHistoryRow;
  onOpenReport: (report: OpenReport) => void;
  /** The lesson's own page on the family web. */
  onOpenLesson?: (lessonId: string) => void;
}
