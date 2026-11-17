import { createFileRoute } from '@tanstack/react-router';
import { SalesStudents } from '@/features/sales/sales/students/SalesStudents';
import { parseStudentsSearch } from '@/features/sales/sales/search';

/**
 * /sales/students?view=mine «الطلاب» — every student of the academy; «طلابي» is a filter.
 * ?student=<id> opens that student's chat (a chat notification).
 */
export const Route = createFileRoute('/sales/students')({
  validateSearch: parseStudentsSearch,
  component: SalesStudentsRoute,
});

function SalesStudentsRoute() {
  const { view = 'all', student } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onView = (next: typeof view) =>
    void navigate({ search: next === 'mine' ? { view: next } : {} });
  // A chat notification (?student=): closing the chat clears it from the URL.
  const chat = student ? { studentId: student, onClose: () => onView(view) } : undefined;
  return <SalesStudents view={view} onView={onView} chat={chat} />;
}
