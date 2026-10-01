import { createFileRoute } from '@tanstack/react-router';
import { LeadsInbox } from '@/features/leads/LeadsInbox';
import { parseLeadSearch } from '@/features/leads/types';

export const Route = createFileRoute('/admin/leads')({
  validateSearch: parseLeadSearch,
  component: LeadsRoute,
});

function LeadsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <LeadsInbox search={search} onSearch={(next) => navigate({ search: next })} />;
}
