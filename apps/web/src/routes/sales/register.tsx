import { createFileRoute, redirect } from '@tanstack/react-router';
import { registerRedirect } from '@/features/sales/sales/registration/register-redirect';

/** The old /sales/register page: registering now starts in the chat, so old links land on the inbox (that chat when known). */
export const Route = createFileRoute('/sales/register')({
  beforeLoad: ({ search }) => {
    throw redirect(registerRedirect(search));
  },
});
