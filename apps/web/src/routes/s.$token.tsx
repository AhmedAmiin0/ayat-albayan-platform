import { createFileRoute } from '@tanstack/react-router';
import { StudentLinkPage } from '@/features/classroom/StudentLinkPage';

/** /s/:token: the student's own long-lived link («رابط دخول الطالب»). Outside every guard: no login, no app shell. */
export const Route = createFileRoute('/s/$token')({ component: StudentLinkRoute });

function StudentLinkRoute() {
  const { token } = Route.useParams();
  return <StudentLinkPage token={token} />;
}
