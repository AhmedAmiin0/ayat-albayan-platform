import { isNewReport } from '@ab/client-core';
import { markReportSeen, useSeenReports } from '@ab/web-kit/portal/use-seen-reports';
import type { ReportActionProps } from './ReportAction.types';

export function useReportAction({ row, onOpenReport }: Omit<ReportActionProps, 'onOpenLesson'>) {
  const seen = useSeenReports();
  const reportId = row.report_id;
  const isNew = (reportId: string): boolean => isNewReport(reportId, seen);
  const open = (reportId: string) => {
    markReportSeen(reportId);
    onOpenReport({ reportId, recordingId: row.recording_id });
  };
  return { reportId, isNew, open };
}
