import { createFileRoute, redirect } from '@tanstack/react-router';
import { registerRedirect } from '@/features/sales/sales/registration/register-redirect';

/** Old /sales/register links: registering starts in the chat, so they land on the inbox. */
export const Route = createFileRoute('/sales/register')({
  beforeLoad: ({ search }) => {
    throw redirect(registerRedirect(search));
  },
});
