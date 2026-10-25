import { createFileRoute } from '@tanstack/react-router';
import { usePermissions } from '@/features/auth/use-permissions';
import { InboxPage } from '@/features/inbox/threads/list/InboxPage';
import { InboxModeContext } from '@/features/inbox/shared/mode';
import { parseInboxSearch } from '@/features/inbox/shared/search';
import { SalesLiveStrip } from '@/features/sales/SalesLiveStrip';

/** /sales/inbox «المحادثات» (the sales landing): every chat (API-scoped, redacted), phones shown; the running lessons as a chip in the list's head. */
export const Route = createFileRoute('/sales/inbox')({
  validateSearch: parseInboxSearch,
  component: SalesInboxRoute,
});

function SalesInboxRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { can } = usePermissions();
  return (
    <InboxModeContext.Provider value="sales">
      <InboxPage
        search={search}
        onSearch={(next) => void navigate({ search: next })}
        head={<SalesLiveStrip enabled={can('self.sales_academy')} compact />}
      />
    </InboxModeContext.Provider>
  );
}
