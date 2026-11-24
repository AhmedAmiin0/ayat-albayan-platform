import { createFileRoute, redirect } from '@tanstack/react-router';

/** Old address kept as a redirect: payments are a filter of earnings now. */
export const Route = createFileRoute('/sales/payments')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/earnings', search: { view: 'payments' } });
  },
});
