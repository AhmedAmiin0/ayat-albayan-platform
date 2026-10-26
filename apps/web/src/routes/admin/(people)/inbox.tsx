import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { parseInboxSearch } from '@/features/messaging/inbox/shared/search';

/** /admin/inbox?phone=&q=&unread=&page= — WhatsApp threads and the open one (R-LEAD-02). */
export const Route = createFileRoute('/admin/(people)/inbox')({
  validateSearch: parseInboxSearch,
  component: InboxRoute,
});

function InboxRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <InboxPage search={search} onSearch={(next) => void navigate({ search: next })} />;
}
