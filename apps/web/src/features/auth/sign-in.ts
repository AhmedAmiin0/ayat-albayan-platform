import { HOME_BY_ROLE } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { forgetWebPush } from '@/features/notifications/web-push';
import { supabase } from '@/lib/supabase';
import { firstAllowedPage } from './admin-access';
import { endSession } from './end-session';
import { isAccountDisabled, meQuery, type Me } from './me';
import { reportSession } from './session-activity';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true; home: string } | { ok: false; error: string };

/**
 * Where this user lands, or why they may not stay signed in: no role yet, or a base admin whose
 * permissions open no /admin page (the /admin guard would only send them back to /login).
 */
function landing(me: Me | null): SignInResult {
  if (!me?.role) return { ok: false, error: t.auth.noRole };
  if (me.role === 'admin' && !firstAllowedPage(me)) return { ok: false, error: t.auth.noPages };
  return { ok: true, home: HOME_BY_ROLE[me.role] };
}

/**
 * Password sign-in, then asks the API who we are and where to land. A browser push subscription
 * left from whoever used this browser before is dropped first: the new user opts in themselves.
 */
export async function signIn(creds: Credentials, queryClient: QueryClient): Promise<SignInResult> {
  await forgetWebPush();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) {
    void reportSession('login-failed');
    return { ok: false, error: t.auth.invalidCredentials };
  }

  queryClient.removeQueries({ queryKey: meQuery.queryKey });
  const me = await queryClient.fetchQuery(meQuery).catch((error: unknown) => {
    if (isAccountDisabled(error)) return 'disabled' as const;
    throw error;
  });
  if (me === 'disabled') return { ok: false, error: t.users.errors.account_disabled };
  const result = landing(me);
  if (!result.ok) {
    await forgetWebPush();
    await endSession();
    queryClient.removeQueries({ queryKey: meQuery.queryKey });
    return result;
  }
  void reportSession('login');
  return result;
}

/**
 * The activity report and dropping this browser's push subscription both need the token, are
 * bounded and never throw: a dead API never blocks signing out. endSession then always clears
 * this browser's session, even when supabase answers with an error or not at all.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  await Promise.all([reportSession('logout'), forgetWebPush()]);
  await endSession();
  queryClient.clear();
}
