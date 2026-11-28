import { createFileRoute, redirect } from '@tanstack/react-router';
import { canDo, meQuery } from '@ab/web-kit';
import { firstSalesRoute } from '@/features/sales/sales/first-sales-route';

/** /sales opens the first nav page the role allows (the chats by default). */
export const Route = createFileRoute('/sales/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    throw redirect({ to: firstSalesRoute((p) => canDo(me, p)) });
  },
});
