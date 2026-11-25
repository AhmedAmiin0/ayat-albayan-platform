import { createFileRoute } from '@tanstack/react-router';
import { usePermissions } from '@ab/web-kit';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { parseInboxSearch } from '@/features/messaging/inbox/shared/search';
import { SalesLiveStrip } from '@/features/sales/sales/live/SalesLiveStrip';
import { LinkedCourseContext } from '@/features/sales/sales-money';

/** `course` opens that chat's lesson days once; any navigation from the page drops it. */
export const Route = createFileRoute('/sales/inbox')({
  validateSearch: parseInboxSearch,
  component: SalesInboxRoute,
});

function SalesInboxRoute() {
  // `course` is one-shot: the list's links never carry it along.
  const { course, ...search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { can } = usePermissions();
  return (
    <InboxModeContext.Provider value="sales">
      <LinkedCourseContext.Provider value={course ?? null}>
        <InboxPage
          search={search}
          onSearch={(next, how) => void navigate({ search: next, ...how })}
          head={<SalesLiveStrip enabled={can('self.sales_academy')} compact />}
        />
      </LinkedCourseContext.Provider>
    </InboxModeContext.Provider>
  );
}
