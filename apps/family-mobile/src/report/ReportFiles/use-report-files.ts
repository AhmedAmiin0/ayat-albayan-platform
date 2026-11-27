import { t } from '@ab/mobile-kit';
import { useOpenFile, useOpenUrl } from '@/report/use-open-file';
import type { ReportFilesProps } from './ReportFiles.types';

export function useReportFiles({
  studentId,
  reportId,
  pdfUrl,
}: Pick<ReportFilesProps, 'studentId' | 'reportId' | 'pdfUrl'>) {
  const file = useOpenFile();
  const recording = useOpenFile();
  const url = useOpenUrl();
  const R = t.portal.app.report;
  const pdf = (): void =>
    pdfUrl ? url.mutate(pdfUrl) : file.mutate({ studentId, kind: 'reports', id: reportId });
  const failed = file.isError || url.isError || recording.isError;
  return { file, recording, url, R, pdf, failed };
}
