import { createFileRoute } from '@tanstack/react-router';
import { TeacherReportLinkPage } from '@/features/reporting/reports';

/** /teacher-report/:token — the teacher's signed link to one lesson's «تقرير الحلقة». No login. */
export const Route = createFileRoute('/(public)/teacher-report/$token')({
  component: TeacherReportLinkRoute,
});

function TeacherReportLinkRoute() {
  const { token } = Route.useParams();
  return <TeacherReportLinkPage token={token} />;
}
