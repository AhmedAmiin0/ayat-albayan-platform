import { HOME_BY_ROLE } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n/i18n';
import { clearTabMemories } from '@/features/inbox/shared/tab-memory';
import { forgetWebPush } from '@/features/notifications/web-push';
import { supabase } from '@/lib/http/supabase';
import { isAccountDisabled, meQuery } from './me';
import { reportSession } from './session-activity';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true; home: string } | { ok: false; error: string };

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
