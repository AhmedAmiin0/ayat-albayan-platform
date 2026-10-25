import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { supabase } from '@/core/lib/http/supabase';
import { isAccountDisabled, isOtherAppRole, noticeText } from './login-notice';
import { appRole } from './role-claim';
import type { Me } from './verify-role';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Password sign-in, then only admins, teachers, sales and classroom assistants stay signed in (R-AUTH-01). On success the
 * auth gate (use-auth-gate) sees SIGNED_IN and opens their tabs; the screen does not navigate.
 */
export async function signIn(creds: Credentials): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { ok: false, error: t.auth.invalidCredentials };

  let me: Me;
  try {
    me = await apiFetch<Me>('/auth/me');
  } catch (error) {
    // Signed in but the role is unknown: don't leave a half-checked session behind.
    await supabase.auth.signOut();
    return { ok: false, error: isAccountDisabled(error) ? noticeText('accountDisabled') : t.common.error };
  }
  if (!appRole(me.role)) {
    await supabase.auth.signOut();
    // A guardian/student has an account: say this app is not theirs (noRole means no role).
    return { ok: false, error: isOtherAppRole(me.role) ? noticeText('wrongApp') : t.auth.noRole };
  }
  return { ok: true };
}
