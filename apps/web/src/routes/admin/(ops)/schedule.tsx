import { createFileRoute } from '@tanstack/react-router';
import { parseScheduleSearch } from '@/features/schedule/search';
import { WeekSchedule } from '@/features/schedule/WeekSchedule';

/**
 * /admin/schedule — every teacher's week (or ?view=day&day= one day) with hours, time off, load
 * and free gaps; lesson drawer (R-SCH-01, R-SCH-03, R-SCH-07). ?teacher=<id> still filters.
 */
export const Route = createFileRoute('/admin/(ops)/schedule')({
  validateSearch: parseScheduleSearch,
  component: ScheduleRoute,
});

function ScheduleRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <WeekSchedule search={search} onSearch={(next) => void navigate({ search: parseScheduleSearch(next) })} />;
}
