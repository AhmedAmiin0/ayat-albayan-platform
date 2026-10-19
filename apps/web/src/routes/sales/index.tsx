import { createFileRoute, redirect } from '@tanstack/react-router';
import { canDo, meQuery } from '@/features/auth/me';
import { firstSalesRoute } from '@/features/sales/first-sales-route';

/** /sales lands on the first nav page the held role opens (the chats by default; features/sales/first-sales-route). */
export const Route = createFileRoute('/sales/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    throw redirect({ to: firstSalesRoute((p) => canDo(me, p)) });
  },
});
