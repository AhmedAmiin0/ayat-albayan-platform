import { createFileRoute } from '@tanstack/react-router';
import { CommunicationsPage } from '@/features/settings/pages/CommunicationsPage';
import { communicationsSearch, parseCommunicationsSearch } from '@/features/settings/pages/page-search';
import { LeaveGuard } from '@/features/settings/values/LeaveGuard';

/**
 * /admin/settings/communications «التواصل» — docs/26b §3: one tab at a time (`?tab=`). Leaving the
 * page with unsaved «مواعيد الرسائل» fields or «الإشعارات» rows asks first, naming them (switching
 * tabs keeps them, so it never asks).
 */
export const Route = createFileRoute('/admin/settings/communications')({
  validateSearch: parseCommunicationsSearch,
  component: CommunicationsRoute,
});

function CommunicationsRoute() {
  const { tab = 'sending' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CommunicationsPage
      tab={tab}
      onTab={(next) => void navigate({ search: communicationsSearch(next), replace: true })}
      renderGuard={(names) => <LeaveGuard names={names} />}
    />
  );
}
