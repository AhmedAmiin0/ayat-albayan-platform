import { createFileRoute, redirect } from '@tanstack/react-router';
import { linkLessonId, TeacherReportLinkPage } from '@/features/reporting/reports';

/** A lesson id opens the signed-in report; an older signed token keeps the no-login form. */
export const Route = createFileRoute('/(public)/teacher-report/$token')({
  beforeLoad: ({ params }) => {
    const lessonId = linkLessonId(params.token);
    const to = '/teacher/report/$lessonId';
    if (lessonId) redirect({ to, params: { lessonId }, replace: true, throw: true });
  },
  component: TeacherReportLinkRoute,
});

function TeacherReportLinkRoute() {
  const { token } = Route.useParams();
  return <TeacherReportLinkPage token={token} />;
}
