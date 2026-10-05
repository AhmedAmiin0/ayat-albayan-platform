import { createFileRoute } from '@tanstack/react-router';
import { parseSubscriptionsSearch } from '@/features/subscriptions/search';
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage';

/** /admin/subscriptions — packages, new from the calculator, payments, alert tasks (R-SUB-01/02). */
export const Route = createFileRoute('/admin/subscriptions')({
  validateSearch: parseSubscriptionsSearch,
  component: SubscriptionsRoute,
});

function SubscriptionsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SubscriptionsPage
      search={search}
      onSearch={(patch) => void navigate({ search: parseSubscriptionsSearch({ ...search, ...patch }) })}
      onOpenStudent={(studentId) => void navigate({ to: '/admin/students/$studentId', params: { studentId } })}
    />
  );
}
