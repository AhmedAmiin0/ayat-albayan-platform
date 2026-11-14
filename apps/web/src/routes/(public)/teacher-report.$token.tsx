import { createFileRoute, redirect } from '@tanstack/react-router';
import { linkLessonId, TeacherReportLinkPage } from '@/features/reporting/reports';

/**
 * /teacher-report/:token — «تقرير الحلقة» from WhatsApp. A lesson id (what is sent now, owner
 * 2026-11-14) opens the signed-in /teacher/report/<id>; a signed token sent before keeps the
 * no-login form until it expires.
 */
export const Route = createFileRoute('/(public)/teacher-report/$token')({
  beforeLoad: ({ params }) => {
    const lessonId = linkLessonId(params.token);
    if (lessonId) {
      throw redirect({ to: '/teacher/report/$lessonId', params: { lessonId }, replace: true });
    }
  },
  component: TeacherReportLinkRoute,
});

function TeacherReportLinkRoute() {
  const { token } = Route.useParams();
  return <TeacherReportLinkPage token={token} />;
}
