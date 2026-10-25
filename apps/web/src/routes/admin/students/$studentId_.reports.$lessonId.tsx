import { createFileRoute } from '@tanstack/react-router';
import { ReportFormPage } from '@/features/reports/ReportFormPage';

/** /admin/students/$studentId/reports/$lessonId — the admin opens / edits one student's report. */
export const Route = createFileRoute('/admin/students/$studentId_/reports/$lessonId')({ component: AdminReportRoute });

function AdminReportRoute() {
  const { studentId, lessonId } = Route.useParams();
  return <ReportFormPage lessonId={lessonId} role="admin" studentId={studentId} />;
}
