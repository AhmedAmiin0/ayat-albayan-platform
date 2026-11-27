import { isNewReport } from '@ab/client-core';
import { useFamilyClock, useSeenReports } from '@/portal';
import type { ReportRowProps } from './ReportRow.types';

export function useReportRow({ report, student }: Pick<ReportRowProps, 'report' | 'student'>) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const fresh = isNewReport(report.id, useSeenReports());
  const link = { studentId: student.id, reportId: report.id, recordingId: report.recording_id };
  return { clock, fresh, link };
}
