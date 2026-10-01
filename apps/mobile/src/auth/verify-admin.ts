import { ApiError, apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface Me {
  role: string | null;
}

/**
 * With a session in hand: may this person use the admin app? A non-admin (or a dead session) is
 * signed out. Offline or a 5xx keeps the admin in: the role was checked at sign-in and the API
 * checks it on every call, so the cached reads stay usable without a connection (R-MOB-03).
 */
export async function verifyAdmin(): Promise<'admin' | 'out'> {
  try {
    const me = await apiFetch<Me>('/auth/me');
    if (me.role === 'admin') return 'admin';
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) return 'admin';
  }
  await supabase.auth.signOut();
  return 'out';
}
