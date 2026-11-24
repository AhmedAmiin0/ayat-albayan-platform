import { createFileRoute } from '@tanstack/react-router';
import { SalesSchedule } from '@/features/sales/sales/schedule/SalesSchedule';
import { parseSalesScheduleSearch } from '@/features/sales/sales/schedule/schedule-search';

export const Route = createFileRoute('/sales/schedule')({
  validateSearch: parseSalesScheduleSearch,
  component: SalesScheduleRoute,
});

function SalesScheduleRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <SalesSchedule search={search} onSearch={(next) => void navigate({ search: next })} />;
}
