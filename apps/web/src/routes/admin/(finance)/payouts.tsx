import { createFileRoute } from '@tanstack/react-router';
import { currentMonth } from '@/features/finance/payouts/api';
import { PayoutsPage } from '@/features/finance/payouts/PayoutsPage';
import { parseMonthSearch } from '@/features/finance/subscriptions/search';

/** /admin/payouts — teacher payouts by month: generate, approve, pay, CSV (R-PAY-02, R-TCH-04). */
export const Route = createFileRoute('/admin/(finance)/payouts')({
  validateSearch: parseMonthSearch,
  component: PayoutsRoute,
});

function PayoutsRoute() {
  const { month = currentMonth() } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <PayoutsPage month={month} onMonth={(m) => void navigate({ search: { month: m } })} />;
}
