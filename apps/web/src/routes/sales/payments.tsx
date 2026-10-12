import { createFileRoute, redirect } from '@tanstack/react-router';

/** The old /sales/payments page: «مدفوعاتي» is a filter of «أرباحي» now. */
export const Route = createFileRoute('/sales/payments')({
  beforeLoad: () => {
    throw redirect({ to: '/sales/earnings', search: { view: 'payments' } });
  },
});
