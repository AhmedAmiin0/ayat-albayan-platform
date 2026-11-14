import { createFileRoute } from '@tanstack/react-router';
import { parseTeacherCalendarSearch, TeacherCalendar } from '@/features/teaching/teacher';

/** /teacher/calendar?view= «جدولي» — her week grid or her availability (R-TCH-03, R-SCH-08). */
export const Route = createFileRoute('/teacher/calendar')({
  validateSearch: parseTeacherCalendarSearch,
  component: TeacherCalendarPage,
});

function TeacherCalendarPage() {
  const { view = 'lessons' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onView = (next: typeof view) => void navigate({ search: { view: next }, replace: true });
  return <TeacherCalendar view={view} onView={onView} />;
}
