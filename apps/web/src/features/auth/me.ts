import type { UserRole } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/** GET /auth/me. `role` is the BASE role (app section, RLS); `permissions` is resolved by the API per request. */
export interface Me {
  id: string;
  email: string | null;
  role: UserRole | null;
  fullName: string | null;
  locale: string | null;
  tz: string | null;
  roleKey: string | null;
  permissions: string[];
}

/** Current user as seen by the API (verified JWT), or null when signed out. */
export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async (): Promise<Me | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session ? apiFetch<Me>('/auth/me') : null;
  },
  staleTime: 60_000,
});

/** Route guard for beforeLoad: signed in and holding `role` (or any of several), else back to /login. */
export async function requireRole(queryClient: QueryClient, role: UserRole | readonly UserRole[]): Promise<Me> {
  const me = await queryClient.ensureQueryData(meQuery);
  const allowed: readonly UserRole[] = typeof role === 'string' ? [role] : role;
  if (!me?.role || !allowed.includes(me.role)) throw redirect({ to: '/login' });
  return me;
}
