import { createFileRoute } from '@tanstack/react-router';
import { TeacherMessagesPage } from '@/features/teaching/student-channel';

const UUID = /^[0-9a-f-]{36}$/i;

/** /teacher/messages?student= «رسائل الطلاب» (docs/31 §2): my channels with my current students' families. */
export const Route = createFileRoute('/teacher/messages')({
  validateSearch: (search: Record<string, unknown>): { student?: string } =>
    typeof search['student'] === 'string' && UUID.test(search['student']) ? { student: search['student'] } : {},
  component: TeacherMessagesRoute,
});

function TeacherMessagesRoute() {
  const { student } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <TeacherMessagesPage studentId={student ?? null} onPick={(id) => void navigate({ search: id ? { student: id } : {} })} />;
}
