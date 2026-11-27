export interface OpenReport {
  reportId: string;
  recordingId: string | null;
}

export interface Props {
  studentId: string;
  report: OpenReport;
  onBack: () => void;
  /** The back button's words; the staff child page's wording by default. */
  backLabel?: string;
}
