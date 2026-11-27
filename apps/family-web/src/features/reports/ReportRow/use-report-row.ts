import { isNewReport } from '@ab/client-core';
import { useNavigate } from '@tanstack/react-router';
import { markReportSeen, useSeenReports } from '@ab/web-kit';
import type { ReportRowProps } from './ReportRow.types';

export function useReportRow({ report, student }: Pick<ReportRowProps, 'report' | 'student'>) {
  const navigate = useNavigate();
  const fresh = isNewReport(report.id, useSeenReports());
  const open = () => {
    markReportSeen(report.id);
    void navigate({
      to: '/report/$reportId',
      params: { reportId: report.id },
      search: { studentId: student.id, recording: report.recording_id ?? undefined },
    });
  };
  return { fresh, open };
}
