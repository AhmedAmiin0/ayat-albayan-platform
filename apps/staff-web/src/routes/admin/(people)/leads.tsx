import { createFileRoute } from '@tanstack/react-router';
import { LeadsInbox } from '@/features/sales/leads/LeadsInbox';
import { parseLeadSearch } from '@/features/sales/leads/types';

export const Route = createFileRoute('/admin/(people)/leads')({
  validateSearch: parseLeadSearch,
  component: LeadsRoute,
});

function LeadsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <LeadsInbox search={search} onSearch={(next) => navigate({ search: next })} />;
}
