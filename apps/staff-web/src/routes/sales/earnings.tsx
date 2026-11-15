import { createFileRoute } from '@tanstack/react-router';
import { SalesMoney } from '@/features/sales/sales/money/SalesMoney';
import { parseMoneySearch } from '@/features/sales/sales/search';

/** /sales/earnings «محفظتي» — my commissions and balance; ?view=statements «الكشوف», ?view=payments «مدفوعاتي». */
export const Route = createFileRoute('/sales/earnings')({
  validateSearch: parseMoneySearch,
  component: SalesMoneyRoute,
});

function SalesMoneyRoute() {
  const { view = 'earnings' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <SalesMoney view={view} onView={(next) => void navigate({ search: next === 'earnings' ? {} : { view: next } })} />;
}
