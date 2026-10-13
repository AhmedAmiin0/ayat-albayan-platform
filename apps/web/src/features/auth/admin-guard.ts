import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { adminRedirect } from './admin-access';
import { requireRole } from './me';
import { signOut } from './sign-in';

/** Where adminRedirect sends a base admin whose permissions open no /admin page. */
const NO_PAGE = '/login';

/**
 * The /admin layout's beforeLoad: base role admin (requireRole), then the page's permission
 * (adminRedirect). A base admin with no page at all is signed out first (the bounded signOut), so
 * /login never shows to a still-live session that would only be sent back here.
 */
export async function guardAdmin(queryClient: QueryClient, pathname: string): Promise<void> {
  const me = await requireRole(queryClient, 'admin');
  const to = adminRedirect(me, pathname);
  if (!to || to === pathname) return;
  if (to === NO_PAGE) await signOut(queryClient);
  throw redirect({ to });
}
