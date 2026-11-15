import { createFileRoute } from '@tanstack/react-router';
import { PaymentsPage } from '@/features/finance/payments/PaymentsPage';
import { parsePaymentsSearch } from '@/features/finance/payments/search';

/** /admin/payments — payments with their receipts (R-PAY-01); filters and sort live in the URL. */
export const Route = createFileRoute('/admin/(finance)/payments')({
  validateSearch: parsePaymentsSearch,
  component: PaymentsRoute,
});

function PaymentsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PaymentsPage search={search} onSearch={(patch) => void navigate({ search: parsePaymentsSearch({ ...search, ...patch }) })} />;
}
