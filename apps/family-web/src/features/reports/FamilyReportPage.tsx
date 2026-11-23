import { useNavigate, useRouter } from '@tanstack/react-router';
import { t } from '@ab/web-kit/i18n';
import { ReportView } from '@ab/web-kit/portal';
import type { ReportSearch } from './report-search';

/**
 * A sent report opened from a child's «حضرها», a student's «التقارير» or a bell row (docs/51 §6):
 * the parents' PDF content, the PDF and the visible recording. «رجوع» goes back, or home when
 * the report was the first page (a push, a pasted link): never out of the app.
 */
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
