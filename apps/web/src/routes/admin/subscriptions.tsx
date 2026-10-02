import { createFileRoute } from '@tanstack/react-router';
import { parseSubscriptionsSearch } from '@/features/subscriptions/search';
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage';

/** /admin/subscriptions — packages, new from the calculator, payments, alert tasks (R-SUB-01/02). */
export const Route = createFileRoute('/admin/subscriptions')({
  validateSearch: parseSubscriptionsSearch,
  component: SubscriptionsRoute,
});

function SubscriptionsRoute() {
  const { status, page = 1 } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SubscriptionsPage
      status={status}
      page={page}
      onChange={(next) => void navigate({ search: { status: next.status, page: next.page > 1 ? next.page : undefined } })}
      onOpenStudent={(studentId) => void navigate({ to: '/admin/students/$studentId', params: { studentId } })}
    />
  );
}
