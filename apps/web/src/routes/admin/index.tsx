import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { parseDashboardSearch } from '@/features/dashboard/search';

/** /admin — the dashboard (R-RPT-01, R-RPT-02, R-RPT-03): KPI strip, queue, week, period, exports. */
export const Route = createFileRoute('/admin/')({
  validateSearch: parseDashboardSearch,
  component: DashboardRoute,
});

function DashboardRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <DashboardPage search={search} onSearch={(next) => void navigate({ search: next })} />;
}
