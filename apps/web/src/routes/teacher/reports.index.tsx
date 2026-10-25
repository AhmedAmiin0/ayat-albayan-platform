import { createFileRoute } from '@tanstack/react-router';
import { MyReports } from '@/features/teacher/reports/MyReports';
import { MY_REPORTS_LIST_KEYS } from '@/features/teacher/reports/SubmittedReports';
import { parseServerListSearch } from '@/lib/list/server-list-search';

/** /teacher/reports?page&sort&dir&f_<key> — pending, sent (edit window) and my students' history (R-REP-01/02/05). */
export const Route = createFileRoute('/teacher/reports/')({
  validateSearch: (s: Record<string, unknown>) => parseServerListSearch(s, MY_REPORTS_LIST_KEYS),
  component: MyReportsRoute,
});

function MyReportsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <MyReports search={search} onSearch={(patch) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })} />;
}
