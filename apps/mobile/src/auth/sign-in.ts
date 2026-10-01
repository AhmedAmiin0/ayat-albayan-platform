import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Admin app: password sign-in, then only admins may stay signed in. */
export async function signIn(creds: Credentials): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { ok: false, error: t.auth.invalidCredentials };

  const me = await apiFetch<{ role: string | null }>('/auth/me');
  if (me.role !== 'admin') {
    await supabase.auth.signOut();
    return { ok: false, error: t.auth.noRole };
  }
  return { ok: true };
}
