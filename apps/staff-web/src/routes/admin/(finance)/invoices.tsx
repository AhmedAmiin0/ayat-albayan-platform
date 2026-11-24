import { createFileRoute } from '@tanstack/react-router';
import { InvoicesPage } from '@/features/finance/finance/InvoicesPage';
import { parseInvoicesSearch } from '@/features/finance/finance/search';

/** Every booking invoice (R-PAY-03); range, sort and filters live in the URL. */
export const Route = createFileRoute('/admin/(finance)/invoices')({
  validateSearch: parseInvoicesSearch,
  component: InvoicesRoute,
});

function InvoicesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <InvoicesPage search={search} onSearch={(patch) => void navigate({ search: parseInvoicesSearch({ ...search, ...patch }) })} />;
}
