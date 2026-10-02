import { createFileRoute } from '@tanstack/react-router';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { currentMonth } from '@/features/payouts/api';
import { parseMonthSearch } from '@/features/subscriptions/search';

/** /admin/expenses — ads / content / tools spend per month (R-RPT-02). */
export const Route = createFileRoute('/admin/expenses')({
  validateSearch: parseMonthSearch,
  component: ExpensesRoute,
});

function ExpensesRoute() {
  const { month = currentMonth() } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <ExpensesPage month={month} onMonth={(m) => void navigate({ search: { month: m } })} />;
}
