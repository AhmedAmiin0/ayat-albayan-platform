import { createFileRoute } from '@tanstack/react-router';
import { AccountSetupPage, parseReturnSearch, requireSetupPending } from '@/features/people/auth';

/** Teacher on a code-made login only (docs/46 A4); ?redirect= is a same-origin landing path. */
export const Route = createFileRoute('/account-setup/')({
  validateSearch: parseReturnSearch,
  beforeLoad: ({ context }) => requireSetupPending(context.queryClient),
  component: AccountSetupPage,
});
