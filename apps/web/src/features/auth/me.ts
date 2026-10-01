import type { UserRole } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface Me {
  id: string;
  email: string | null;
  role: UserRole | null;
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

/** Route guard for beforeLoad: signed in and holding `role`, else back to /login. */
export async function requireRole(queryClient: QueryClient, role: UserRole): Promise<Me> {
  const me = await queryClient.ensureQueryData(meQuery);
  if (!me || me.role !== role) throw redirect({ to: '/login' });
  return me;
}
