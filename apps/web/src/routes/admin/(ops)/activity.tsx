import { ACTIVITY_FILTER_KEYS, ACTIVITY_SORT_KEYS } from '@ab/shared';
import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '@/features/reporting/activity/ActivityPage';
import { listUrlValidator, parseListUrl, toListUrl } from '@/lib/list/list-url';

const KEYS = { sortKeys: ACTIVITY_SORT_KEYS, filterKeys: ACTIVITY_FILTER_KEYS };

/** /admin/activity «سجل النشاط»: `?page=&sort=&dir=desc&f_<key>=` (R-NFR-08). */
export const Route = createFileRoute('/admin/(ops)/activity')({
  validateSearch: listUrlValidator(KEYS),
  component: ActivityRoute,
});

function ActivityRoute() {
  const search = parseListUrl(Route.useSearch(), KEYS);
  const navigate = Route.useNavigate();
  return <ActivityPage search={search} onSearch={(next) => void navigate({ search: toListUrl(next) })} />;
}
