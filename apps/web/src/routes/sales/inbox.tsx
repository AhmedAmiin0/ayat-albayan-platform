import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '@/features/inbox/InboxPage';
import { InboxModeContext } from '@/features/inbox/mode';
import { parseInboxSearch } from '@/features/inbox/search';

/** /sales/inbox «المحادثات»: my leads and families (API-scoped), phones shown. */
export const Route = createFileRoute('/sales/inbox')({
  validateSearch: parseInboxSearch,
  component: SalesInboxRoute,
});

function SalesInboxRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <InboxModeContext.Provider value="sales">
      <InboxPage search={search} onSearch={(next) => void navigate({ search: next })} />
    </InboxModeContext.Provider>
  );
}
