import { createFileRoute, notFound } from '@tanstack/react-router';
import { parsePayReturn, PayPage, stripeBuild } from '@/features/sales/payment-links';

/** Family payment link (docs/30, FEATURE_STRIPE); without the flag the router shows not-found. */
export const Route = createFileRoute('/(public)/pay/$token')({
  validateSearch: parsePayReturn,
  beforeLoad: () => {
    if (!stripeBuild()) notFound({ throw: true });
  },
  component: PayRoute,
});

function PayRoute() {
  const { token } = Route.useParams();
  return <PayPage token={token} back={Route.useSearch()} />;
}
