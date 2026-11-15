import { createFileRoute } from '@tanstack/react-router';
import { AccountSetupPage, parseReturnSearch, requireSetupPending } from '@/features/people/auth';

/**
 * /account-setup «أكمل حسابك» (docs/46 A4): a teacher on her code-made login only.
 * ?redirect=<same-origin path>: where to land once set up (owner 2026-11-14).
 */
export const Route = createFileRoute('/account-setup/')({
  validateSearch: parseReturnSearch,
  beforeLoad: ({ context }) => requireSetupPending(context.queryClient),
  component: AccountSetupPage,
});
