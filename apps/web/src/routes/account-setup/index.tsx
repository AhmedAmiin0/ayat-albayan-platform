import { createFileRoute } from '@tanstack/react-router';
import { AccountSetupPage, requireSetupPending } from '@/features/people/auth';

/** /account-setup «أكمل حسابك» (docs/46 A4): a teacher on her code-made login only. */
export const Route = createFileRoute('/account-setup/')({
  beforeLoad: ({ context }) => requireSetupPending(context.queryClient),
  component: AccountSetupPage,
});
