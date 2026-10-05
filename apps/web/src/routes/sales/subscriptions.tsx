import { createFileRoute } from '@tanstack/react-router';
import { SalesSubscriptions } from '@/features/sales/SalesSubscriptions';
import { parseSalesSubscriptionsSearch } from '@/features/sales/search';

/** /sales/subscriptions?kind= «الاشتراكات» — pending and confirmed, two separate lists. */
export const Route = createFileRoute('/sales/subscriptions')({
  validateSearch: parseSalesSubscriptionsSearch,
  component: SalesSubscriptionsRoute,
});

function SalesSubscriptionsRoute() {
  const { kind = 'pending' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SalesSubscriptions
      kind={kind}
      onKind={(next) => void navigate({ search: next === 'confirmed' ? { kind: next } : {} })}
    />
  );
}
