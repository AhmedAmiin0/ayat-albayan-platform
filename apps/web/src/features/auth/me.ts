import type { Permission, UserRole } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface Me {
  id: string;
  email: string | null;
  role: UserRole | null;
  /** Effective permissions of the held role (dynamic roles); the API enforces the same set. */
  permissions: Permission[];
}

/** Current user as seen by the API (verified JWT), or null when signed out. */
export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async (): Promise<Me | null> => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const me = await apiFetch<Me>('/auth/me');
    return { ...me, permissions: me.permissions ?? [] };
  },
  staleTime: 60_000,
});

/**
 * Route guard for beforeLoad: signed in and holding `role` (or any of several), else back to
 * /login. The role is the BASE SCOPE (which app, which home); pages inside are gated by permission.
 */
export async function requireRole(queryClient: QueryClient, role: UserRole | readonly UserRole[]): Promise<Me> {
  const me = await queryClient.ensureQueryData(meQuery);
  const allowed: readonly UserRole[] = typeof role === 'string' ? [role] : role;
  if (!me?.role || !allowed.includes(me.role)) throw redirect({ to: '/login' });
  return me;
}

/** Does this user hold `permission`? Signed out holds nothing. */
export function canDo(me: Me | null | undefined, permission: Permission): boolean {
  return me?.permissions.includes(permission) ?? false;
}
