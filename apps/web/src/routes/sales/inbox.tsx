import { createFileRoute } from '@tanstack/react-router';
import { usePermissions } from '@/features/auth/use-permissions';
import { InboxPage } from '@/features/inbox/InboxPage';
import { InboxModeContext } from '@/features/inbox/mode';
import { parseInboxSearch } from '@/features/inbox/search';
import { SalesLiveStrip } from '@/features/sales/SalesLiveStrip';

/** /sales/inbox «المحادثات» (the sales landing): every chat (API-scoped, redacted), phones shown; the running lessons on top. */
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
      <SalesLiveStrip enabled={can('self.sales_academy')} />
      <InboxPage search={search} onSearch={(next) => void navigate({ search: next })} />
    </InboxModeContext.Provider>
  );
}
