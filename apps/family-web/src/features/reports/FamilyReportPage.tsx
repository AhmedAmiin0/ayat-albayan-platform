import { useNavigate, useRouter } from '@tanstack/react-router';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ReportView } from '@ab/web-kit/portal/report/ReportView';
import type { ReportSearch } from './report-search';

/** docs/51 §6: back goes home when the report was the first page, never out of the app. */
export function FamilyReportPage({ reportId, search }: { reportId: string; search: ReportSearch }) {
  const router = useRouter();
  const navigate = useNavigate();
  const back = () =>
    router.history.canGoBack() ? router.history.back() : void navigate({ to: '/portal' });
  return (
    <ReportView
      studentId={search.studentId}
      report={{ reportId, recordingId: search.recording ?? null }}
      onBack={back}
      backLabel={t.common.back}
    />
  );
}
