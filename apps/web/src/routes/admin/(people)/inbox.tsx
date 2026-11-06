import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { parseInboxSearch, type InboxSearch } from '@/features/messaging/inbox/shared/search';

/** /admin/inbox?phone=&q=&unread=&page= — WhatsApp threads and the open one (R-LEAD-02). */
export const Route = createFileRoute('/admin/(people)/inbox')({
  validateSearch: parseInboxSearch,
  component: InboxRoute,
});

function InboxRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearch = (next: InboxSearch, how?: { replace: boolean }) =>
    void navigate({ search: next, ...how });
  return <InboxPage search={search} onSearch={onSearch} />;
}
