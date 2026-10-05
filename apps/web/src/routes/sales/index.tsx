import { createFileRoute, redirect } from '@tanstack/react-router';

/** /sales lands on the chats. */
export const Route = createFileRoute('/sales/')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/inbox', search: { page: 1 } });
  },
});
