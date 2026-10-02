import { createFileRoute } from '@tanstack/react-router';
import { parseScheduleSearch } from '@/features/schedule/search';
import { WeekSchedule } from '@/features/schedule/WeekSchedule';

/** /admin/schedule — the week across teachers, lesson drawer (R-SCH-01, R-SCH-03, R-SCH-07). */
export const Route = createFileRoute('/admin/schedule')({
  validateSearch: parseScheduleSearch,
  component: ScheduleRoute,
});

function ScheduleRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <WeekSchedule search={search} onSearch={(next) => void navigate({ search: parseScheduleSearch(next) })} />;
}
