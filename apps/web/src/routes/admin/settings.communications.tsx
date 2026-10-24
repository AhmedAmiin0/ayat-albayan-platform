import { createFileRoute, redirect } from '@tanstack/react-router';
import { CommunicationsPage } from '@/features/settings/pages/CommunicationsPage';
import { communicationsSearch, parseCommunicationsSearch, shownTab, timingRedirect } from '@/features/settings/pages/page-search';
import { LeaveGuard } from '@/features/settings/values/LeaveGuard';

/**
 * /admin/settings/communications «التواصل» — docs/23 §2d, docs/26b §3: one tab at a time (`?tab=`),
 * «نظرة عامة» by default. The old `?tab=timing` goes on to «القيم» › «الرسائل». Leaving the page with
 * unsaved «الإشعارات» rows asks first, naming them (switching tabs keeps them, so it never asks).
 */
export const Route = createFileRoute('/admin/settings/communications')({
  validateSearch: parseCommunicationsSearch,
  beforeLoad: ({ search }) => {
    const to = timingRedirect(search);
    if (to) throw redirect(to);
  },
  component: CommunicationsRoute,
});

function CommunicationsRoute() {
  const tab = shownTab(Route.useSearch());
  const navigate = Route.useNavigate();
  return (
    <CommunicationsPage
      tab={tab}
      onTab={(next) => void navigate({ search: communicationsSearch(next), replace: true })}
      renderGuard={(names) => <LeaveGuard names={names} />}
    />
  );
}
