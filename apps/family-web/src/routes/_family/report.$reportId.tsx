import { createFileRoute } from '@tanstack/react-router';
import { FamilyReportPage, parseReportSearch } from '@/features/reports';

/** A sent report of one of the login's students (the portal API refuses any other). */
export const Route = createFileRoute('/_family/report/$reportId')({
  validateSearch: parseReportSearch,
  component: Report,
});

function Report() {
  const { reportId } = Route.useParams();
  const search = Route.useSearch();
  return <FamilyReportPage reportId={reportId} search={search} />;
}
