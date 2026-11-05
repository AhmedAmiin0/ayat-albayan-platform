import { createFileRoute } from '@tanstack/react-router';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { InboxPage } from '@/features/messaging/inbox/threads/list/InboxPage';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { parseInboxSearch } from '@/features/messaging/inbox/shared/search';
import { SalesLiveStrip } from '@/features/sales/sales/live/SalesLiveStrip';
import { LinkedCourseContext } from '@/features/sales/sales-money';

/**
 * /sales/inbox «المحادثات» (the sales landing): every chat (API-scoped, redacted), phones shown; the
 * running lessons as a chip in the list's head. `course` (a «احجز أيام الحلقات» notice, owner
 * 2026-11-06) opens that chat's «أيام الحلقات» once: any navigation from the page drops it.
 */
export const Route = createFileRoute('/sales/inbox')({
  validateSearch: parseInboxSearch,
  component: SalesInboxRoute,
});

function SalesInboxRoute() {
  // `course` opens its chat's «أيام الحلقات» only: the list's links never carry it along.
  const { course, ...search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { can } = usePermissions();
  return (
    <InboxModeContext.Provider value="sales">
      <LinkedCourseContext.Provider value={course ?? null}>
        <InboxPage
          search={search}
          onSearch={(next) => void navigate({ search: next })}
          head={<SalesLiveStrip enabled={can('self.sales_academy')} compact />}
        />
      </LinkedCourseContext.Provider>
    </InboxModeContext.Provider>
  );
}
