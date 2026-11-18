import { useNavigate, useRouter } from '@tanstack/react-router';
import { FamilyReportView } from '@ab/web-kit/components/family/pages/report/FamilyReportView';
import type { ReportSearch } from './report-search';

/**
 * A sent report opened from a child's «حضرها», a student's «التقارير» or a bell row (docs/51 §6):
 * the parents' PDF content in the family look (band + cards), the PDF and the visible recording.
 * «العودة» goes back, or home when the report was the first page (a push, a pasted link): never
 * out of the app.
 */
export function FamilyReportPage({ reportId, search }: { reportId: string; search: ReportSearch }) {
  const router = useRouter();
  const navigate = useNavigate();
  const back = () =>
    router.history.canGoBack() ? router.history.back() : void navigate({ to: '/portal' });
  return (
    <FamilyReportView
      studentId={search.studentId}
      report={{ reportId, recordingId: search.recording ?? null }}
      onBack={back}
    />
  );
}
