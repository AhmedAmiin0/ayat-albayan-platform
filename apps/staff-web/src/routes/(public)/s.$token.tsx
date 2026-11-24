import { createFileRoute } from '@tanstack/react-router';
import { StudentLinkPage } from '@/features/teaching/classroom/student-link/StudentLinkPage';

/** The student's own long-lived link, outside every guard: no login, no app shell. */
export const Route = createFileRoute('/(public)/s/$token')({ component: StudentLinkRoute });

function StudentLinkRoute() {
  const { token } = Route.useParams();
  return <StudentLinkPage token={token} />;
}
