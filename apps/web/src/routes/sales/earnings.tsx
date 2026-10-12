import { createFileRoute } from '@tanstack/react-router';
import { SalesMoney } from '@/features/sales/SalesMoney';
import { parseMoneySearch } from '@/features/sales/search';

/** /sales/earnings?view=payments «أرباحي» — my salary, commissions and statements; «مدفوعاتي» is a filter. */
export const Route = createFileRoute('/sales/earnings')({
  validateSearch: parseMoneySearch,
  component: SalesMoneyRoute,
});

function SalesMoneyRoute() {
  const { view = 'earnings' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <SalesMoney view={view} onView={(next) => void navigate({ search: next === 'payments' ? { view: next } : {} })} />;
}
