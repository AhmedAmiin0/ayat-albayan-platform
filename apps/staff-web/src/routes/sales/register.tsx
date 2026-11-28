import { createFileRoute, redirect } from '@tanstack/react-router';
import { registerRedirect } from '@/features/sales/sales/registration/register-redirect';

/** Old /sales/register links land on the inbox (that chat when known): registering starts there. */
export const Route = createFileRoute('/sales/register')({
  beforeLoad: ({ search }) => {
    redirect({ ...registerRedirect(search), throw: true });
  },
});
