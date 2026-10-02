import { createFileRoute } from '@tanstack/react-router';
import { ReportFormPage } from '@/features/reports/ReportFormPage';

/** /teacher/report/$lessonId — «تقرير الحلقة» opened from the lesson (R-REP-01/02). */
export const Route = createFileRoute('/teacher/report/$lessonId')({ component: TeacherReportRoute });

function TeacherReportRoute() {
  const { lessonId } = Route.useParams();
  return <ReportFormPage lessonId={lessonId} role="teacher" />;
}
