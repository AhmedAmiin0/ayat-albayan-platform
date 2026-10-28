import { createFileRoute, notFound } from '@tanstack/react-router';
import { parsePayReturn, PayPage, stripeBuild } from '@/features/sales/payment-links';

/**
 * /pay/:token — «رابط دفع» for the family (docs/30, TEST BUILD ONLY). Outside every guard: no login.
 * A normal build has no such page: the router's not-found, and no request.
 */
export const Route = createFileRoute('/(public)/pay/$token')({
  validateSearch: parsePayReturn,
  beforeLoad: () => {
    if (!stripeBuild()) throw notFound();
  },
  component: PayRoute,
});

function PayRoute() {
  const { token } = Route.useParams();
  return <PayPage token={token} back={Route.useSearch()} />;
}
