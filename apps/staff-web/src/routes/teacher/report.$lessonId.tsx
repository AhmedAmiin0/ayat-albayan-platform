import { createFileRoute } from '@tanstack/react-router';
import { ReportFormPage } from '@/features/reporting/reports/ReportFormPage';

export const Route = createFileRoute('/teacher/report/$lessonId')({ component: TeacherReportRoute });

function TeacherReportRoute() {
  const { lessonId } = Route.useParams();
  return <ReportFormPage lessonId={lessonId} role="teacher" />;
}
