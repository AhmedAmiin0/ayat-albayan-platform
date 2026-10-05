import { createFileRoute } from '@tanstack/react-router';
import { InvoicesPage } from '@/features/finance/InvoicesPage';
import { parseInvoicesSearch } from '@/features/finance/search';

/** /admin/invoices — every booking invoice (R-PAY-03), «سجّل كدفعة» from one; range, sort and filters in the URL. */
export const Route = createFileRoute('/admin/invoices')({
  validateSearch: parseInvoicesSearch,
  component: InvoicesRoute,
});

function InvoicesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <InvoicesPage search={search} onSearch={(patch) => void navigate({ search: parseInvoicesSearch({ ...search, ...patch }) })} />;
}
