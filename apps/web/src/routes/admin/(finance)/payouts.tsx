import { createFileRoute } from '@tanstack/react-router';
import { currentMonth } from '@/features/payouts/api';
import { PayoutsPage } from '@/features/payouts/PayoutsPage';
import { parseMonthSearch } from '@/features/subscriptions/search';

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
