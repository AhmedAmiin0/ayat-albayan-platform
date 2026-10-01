import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Me } from './verify-admin';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Admin app: password sign-in, then only admins may stay signed in. On success the auth gate
 * (use-auth-gate) sees SIGNED_IN and opens the tabs; the screen does not navigate itself.
 */
export async function signIn(creds: Credentials): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { ok: false, error: t.auth.invalidCredentials };

  let me: Me;
  try {
    me = await apiFetch<Me>('/auth/me');
  } catch {
    // Signed in but the role is unknown: don't leave a half-checked session behind.
    await supabase.auth.signOut();
    return { ok: false, error: t.common.error };
  }
  if (me.role !== 'admin') {
    await supabase.auth.signOut();
    return { ok: false, error: t.auth.noRole };
  }
  return { ok: true };
}
