import { createFileRoute } from '@tanstack/react-router';
import { PaymentsPage } from '@/features/payments/PaymentsPage';
import { parsePage } from '@/features/subscriptions/search';

/** /admin/payments — payments with their receipts (R-PAY-01). */
export const Route = createFileRoute('/admin/payments')({
  validateSearch: parsePage,
  component: PaymentsRoute,
});

function PaymentsRoute() {
  const { page = 1 } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PaymentsPage page={page} onPage={(p) => void navigate({ search: { page: p > 1 ? p : undefined } })} />;
}
