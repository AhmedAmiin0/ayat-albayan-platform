import { useNavigate, useSearch } from '@tanstack/react-router';
import { LeaveGuard } from './LeaveGuard';
import type { ValuesSearch } from './values-search';
import { ValuesView } from './ValuesView';

const FROM = '/admin/settings/values';

/** The route's component: `?group=&q=&filter=` from the URL (replace, so typing adds no history), and the leave guard. */
export function ValuesPage() {
  const search = useSearch({ from: FROM });
  const navigate = useNavigate({ from: FROM });
  const onSearch = (next: ValuesSearch) => void navigate({ search: next, replace: (next.q ?? '') !== (search.q ?? '') });
  return <ValuesView search={search} onSearch={onSearch} renderGuard={(names) => <LeaveGuard names={names} />} />;
}
