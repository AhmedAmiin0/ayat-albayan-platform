import { t, ReportView } from '@ab/web-kit';
import type { FamilyReportPageProps } from './FamilyReportPage.types';
import { useFamilyReportPage } from './use-family-report-page';

/** docs/51 §6: back goes home when the report was the first page, never out of the app. */
export function FamilyReportPage({ reportId, search }: FamilyReportPageProps) {
  const { back } = useFamilyReportPage();
  return (
    <ReportView
      studentId={search.studentId}
      report={{ reportId, recordingId: search.recording ?? null }}
      onBack={back}
      backLabel={t.common.back}
    />
  );
}
