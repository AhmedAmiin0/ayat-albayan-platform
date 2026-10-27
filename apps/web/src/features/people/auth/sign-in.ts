import { isEmailIdentifier, signInError } from '@ab/client-core';
import { HOME_BY_ROLE, type PasswordSession } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/messaging/inbox/shared/tab-memory';
import { forgetWebPush } from '@/features/messaging/notifications/web-push/web-push';
import { supabase } from '@/lib/http/supabase';
import { authApi, signInErrorText } from './login/auth-api';
import { isAccountDisabled, meQuery } from './me';
import { reportSession } from './session-activity';

/** `email` is what the user typed: an email (GoTrue directly) or a username / student code (POST /auth/login). */
export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true; home: string } | { ok: false; error: string };

const startSession = async (s: PasswordSession): Promise<string | null> => {
  const { error } = await supabase.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
  return error ? t.common.error : null;
};

/** Holds a session for the typed identifier, or says why not (docs/30 §5). */
async function passwordSession(creds: Credentials): Promise<string | null> {
  const identifier = creds.email.trim();
  if (isEmailIdentifier(identifier)) {
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password: creds.password });
    return error ? t.auth.invalidCredentials : null;
  }
  try {
    return await startSession(await authApi.login({ username: identifier, password: creds.password }));
  } catch (e) {
    return signInError(e) === 'invalid_credentials' ? t.auth.invalidCredentials : signInErrorText(e);
  }
}

/**
 * Password sign-in (email or username), then asks the API who we are and where to land. A browser
 * push subscription left from whoever used this browser before is dropped first: the new user opts in themselves.
 */
export async function signIn(creds: Credentials, queryClient: QueryClient): Promise<SignInResult> {
  await forgetWebPush();
  const error = await passwordSession(creds);
  if (error) {
    void reportSession('login-failed');
    return { ok: false, error };
  }
  return finishSignIn(queryClient);
}

/** The family's WhatsApp code: the API answers a magic-link token hash that supabase-js turns into a session. */
export async function signInWithCode(body: { phone: string; code: string }, queryClient: QueryClient): Promise<SignInResult> {
  await forgetWebPush();
  const session = await authApi.verifyCode(body).catch(signInErrorText);
  if (typeof session === 'string') return { ok: false, error: session };
  const { error } = await supabase.auth.verifyOtp({ type: session.type, token_hash: session.token_hash });
  if (error) return { ok: false, error: t.familyAuth.errors.invalid_code };
  return finishSignIn(queryClient);
}

/** After any way of signing in: who we are (a disabled account or one without a role is signed out) and the landing. */
async function finishSignIn(queryClient: QueryClient): Promise<SignInResult> {
  queryClient.removeQueries({ queryKey: meQuery.queryKey });
  const me = await queryClient.fetchQuery(meQuery).catch((error: unknown) => {
    if (isAccountDisabled(error)) return 'disabled' as const;
    throw error;
  });
  if (me === 'disabled') return { ok: false, error: t.users.errors.account_disabled };
  if (!me?.role) {
    await forgetWebPush();
    await supabase.auth.signOut();
    return { ok: false, error: t.auth.noRole };
  }
  void reportSession('login');
  return { ok: true, home: HOME_BY_ROLE[me.role] };
}

/**
 * The activity report and dropping this browser's push subscription both need the token, are
 * bounded and never throw: a dead API never blocks signing out. On a shared PC the next user must
 * not find the chats' unsent replies or a half-typed registration: those tab memories go with the cache.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  await Promise.all([reportSession('logout'), forgetWebPush()]);
  await supabase.auth.signOut();
  queryClient.clear();
  clearTabMemories();
}
