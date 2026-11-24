import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunicationsPage } from '@/features/platform/settings/pages/CommunicationsPage';
import { communicationsSearch, parseCommunicationsSearch, shownTab, timingRedirect } from '@/features/platform/settings/pages/page-search';
import { LeaveGuard } from '@/features/platform/settings/values/sheet/LeaveGuard';

/** docs/23 §2d, docs/26b §3: old ?tab=timing redirects; unsaved rows ask before leaving. */
export const Route = createFileRoute('/admin/settings/communications')({
  validateSearch: parseCommunicationsSearch,
  beforeLoad: ({ search }) => {
    const to = timingRedirect(search);
    if (to) throw redirect(to);
  },
  component: CommunicationsRoute,
});

function CommunicationsRoute() {
  const search = Route.useSearch();
  const tab = shownTab(search);
  const navigate = Route.useNavigate();
  return (
    <CommunicationsPage
      tab={tab}
      audience={search.audience}
      onTab={(next) => void navigate({ search: communicationsSearch(next), replace: true })}
      renderGuard={(names) => <LeaveGuard names={names} />}
    />
  );
}
