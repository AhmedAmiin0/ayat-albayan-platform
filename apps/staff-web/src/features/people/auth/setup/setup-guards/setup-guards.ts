import { needsSetup } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { requireRole, type Me, returnSearchOf } from '@ab/web-kit';

/**
 * /teacher/*: a teacher whose code-made login is set up (docs/46 A4), else /account-setup. `back`
 * (the page asked for) rides to /login and /account-setup as `?redirect=`.
 */
export async function requireTeacherPortal(queryClient: QueryClient, back?: string): Promise<Me> {
  const me = await requireRole(queryClient, 'teacher', back);
  const search = returnSearchOf(back);
  if (needsSetup(me)) redirect({ to: '/account-setup', search, throw: true });
  return me;
}

/** /account-setup: only while setup is pending; done → her home. */
export async function requireSetupPending(queryClient: QueryClient): Promise<Me> {
  const me = await requireRole(queryClient, 'teacher');
  if (!needsSetup(me)) redirect({ to: '/teacher', throw: true });
  return me;
}
