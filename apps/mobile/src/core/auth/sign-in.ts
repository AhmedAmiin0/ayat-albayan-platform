import { isEmailIdentifier } from '@ab/client-core';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { supabase } from '@/core/lib/http/supabase';
import { authApi, loginErrorText } from './forgot';
import { isAccountDisabled, isOtherAppRole, noticeText } from './login-notice';
import { appRole } from './role-claim';
import type { Me } from './verify-role';

export interface Credentials {
  /** An email (GoTrue directly) or a username (POST /auth/login), docs/30 §5. */
  identifier: string;
  password: string;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Opens the Supabase session; the refusal's words, or null when signed in. */
async function openSession({ identifier, password }: Credentials): Promise<string | null> {
  if (isEmailIdentifier(identifier)) {
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    if (!error) return null;
    return error.status === 429 ? t.familyAuth.errors.too_many_requests : t.auth.invalidCredentials;
  }
  try {
    const session = await authApi.login({ username: identifier, password });
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    return error ? t.auth.invalidCredentials : null;
  } catch (error) {
    return loginErrorText(error);
  }
}

/** Only admins, teachers, sales and classroom assistants stay signed in (R-AUTH-01). */
async function checkRole(): Promise<SignInResult> {
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

/**
 * Email or username + password, then the role check. On success the auth gate (use-auth-gate) sees
 * SIGNED_IN and opens their tabs; the screen does not navigate.
 */
export async function signIn(creds: Credentials): Promise<SignInResult> {
  const refused = await openSession(creds);
  return refused === null ? checkRole() : { ok: false, error: refused };
}
