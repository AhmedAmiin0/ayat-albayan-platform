import { createFileRoute } from '@tanstack/react-router';
import { parseTeacherCalendarSearch, TeacherCalendar } from '@/features/teaching/teacher';

/** /teacher/calendar?period= «جدولي» — her week grid or her month (R-TCH-03, R-SCH-08). */
export const Route = createFileRoute('/teacher/calendar')({
  validateSearch: parseTeacherCalendarSearch,
  component: TeacherCalendarPage,
});

function TeacherCalendarPage() {
  const { period = 'week' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onPeriod = (next: typeof period) =>
    void navigate({ search: { period: next }, replace: true });
  return <TeacherCalendar period={period} onPeriod={onPeriod} />;
}
