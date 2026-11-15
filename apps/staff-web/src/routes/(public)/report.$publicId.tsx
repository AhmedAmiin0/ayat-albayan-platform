import { createFileRoute } from '@tanstack/react-router';
import { ReportPage } from '@/features/reporting/report-page';

/** /report/:publicId — a lesson report's live page (the link in report_ready_*). No app shell. */
export const Route = createFileRoute('/(public)/report/$publicId')({
  component: ReportPageRoute,
});

function ReportPageRoute() {
  const { publicId } = Route.useParams();
  return <ReportPage publicId={publicId} />;
}
