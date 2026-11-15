import type { ChildTab } from '@ab/client-core';
import { createFileRoute } from '@tanstack/react-router';
import { parseChildSearch } from '@/features/children';
import { HomePage } from '@/features/home';
import { WithHome } from '@/features/shell';

/** «الرئيسية»; `?tab=` opens a student's own tab (an alert opens the package). */
export const Route = createFileRoute('/_family/portal')({
  validateSearch: parseChildSearch,
  component: Portal,
});

function Portal() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onTab = (next: ChildTab) => void navigate({ search: { tab: next } });
  return <WithHome>{(home) => <HomePage home={home} tab={tab} onTab={onTab} />}</WithHome>;
}
