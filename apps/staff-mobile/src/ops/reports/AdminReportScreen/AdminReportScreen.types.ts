import type { ReportView } from '@ab/shared';

export interface AdminReportScreenState {
  report: ReportView | undefined;
  /** The read failed and nothing is cached: the error with its retry. */
  failed: boolean;
  retry: () => void;
  pdfFailed: boolean;
  openPdf: (reportId: string) => void;
}
