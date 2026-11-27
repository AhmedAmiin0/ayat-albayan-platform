export interface ReportFilesProps {
  studentId: string;
  reportId: string;
  /** The page's own signed PDF link; null while it is generated or when the page did not load. */
  pdfUrl: string | null;
  recordingId: string | null;
}
