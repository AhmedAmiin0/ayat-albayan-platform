import { createFileRoute } from '@tanstack/react-router';
import { CommunicationsPage } from '@/features/settings/pages/CommunicationsPage';
import { communicationsSearch, parseCommunicationsSearch } from '@/features/settings/pages/page-search';

/** /admin/settings/communications «التواصل» — docs/26b §3: one tab at a time (`?tab=`). */
export const Route = createFileRoute('/admin/settings/communications')({
  validateSearch: parseCommunicationsSearch,
  component: CommunicationsRoute,
});

function CommunicationsRoute() {
  const { tab = 'sending' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <CommunicationsPage tab={tab} onTab={(next) => void navigate({ search: communicationsSearch(next), replace: true })} />;
}
