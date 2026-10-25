import { createFileRoute } from '@tanstack/react-router';
import { SalesSubscriptions } from '@/features/sales/subscriptions/SalesSubscriptions';
import { parseSalesSubscriptionsSearch } from '@/features/sales/search';

/** /sales/subscriptions?kind=&history= «الاشتراكات» — pending and confirmed, two separate lists; a confirmed one's history. */
export const Route = createFileRoute('/sales/subscriptions')({
  validateSearch: parseSalesSubscriptionsSearch,
  component: SalesSubscriptionsRoute,
});

function SalesSubscriptionsRoute() {
  const { kind = 'pending', history } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SalesSubscriptions
      kind={kind}
      onKind={(next) => void navigate({ search: next === 'confirmed' ? { kind: next } : {} })}
      history={history}
      onHistory={(id) => void navigate({ search: id ? { kind: 'confirmed', history: id } : { kind: 'confirmed' } })}
    />
  );
}
