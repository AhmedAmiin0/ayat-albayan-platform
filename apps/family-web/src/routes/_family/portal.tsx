import type { ChildTab } from '@ab/client-core';
import { createFileRoute } from '@tanstack/react-router';
import { parseChildSearch, WithPick } from '@/features/children';
import { HomePage } from '@/features/home';

/** ?tab= opens a tab, so an alert can open the package. */
export const Route = createFileRoute('/_family/portal')({
  validateSearch: parseChildSearch,
  component: Portal,
});

function Portal() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onTab = (next: ChildTab) => void navigate({ search: { tab: next } });
  return (
    <WithPick>
      {(student, home) => <HomePage student={student} kind={home.kind} tab={tab} onTab={onTab} />}
    </WithPick>
  );
}
