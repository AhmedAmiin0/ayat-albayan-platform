import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { parseInboxSearch } from '@/features/messaging/inbox/shared/search';

/** /teacher/inbox «المحادثات»: the families I teach and my own chat with the academy (R-TCH-03, R-MSG-05). */
export const Route = createFileRoute('/teacher/inbox')({
  validateSearch: parseInboxSearch,
  component: TeacherInboxRoute,
});

function TeacherInboxRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <InboxModeContext.Provider value="teacher">
      <InboxPage search={search} onSearch={(next) => void navigate({ search: next })} />
    </InboxModeContext.Provider>
  );
}
