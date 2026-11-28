import { createFileRoute, redirect } from '@tanstack/react-router';
import { canDo, meQuery } from '@ab/web-kit';
import { firstSalesRoute } from '@/features/sales/sales/first-sales-route';

/** /sales lands on the first nav page the role opens (chats by default; first-sales-route). */
export const Route = createFileRoute('/sales/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.query({ ...meQuery, staleTime: 'static' });
    redirect({ to: firstSalesRoute((p) => canDo(me, p)), throw: true });
  },
});
