import { HOME_BY_ROLE } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { meQuery } from './me';

export interface Credentials {
  email: string;
  password: string;
}

export type SignInResult = { ok: true; home: string } | { ok: false; error: string };

/** Password sign-in, then asks the API who we are and where to land. */
export async function signIn(creds: Credentials, queryClient: QueryClient): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) return { ok: false, error: t.auth.invalidCredentials };

  queryClient.removeQueries({ queryKey: meQuery.queryKey });
  const me = await queryClient.fetchQuery(meQuery);
  if (!me?.role) {
    await supabase.auth.signOut();
    return { ok: false, error: t.auth.noRole };
  }
  return { ok: true, home: HOME_BY_ROLE[me.role] };
}

export async function signOut(queryClient: QueryClient): Promise<void> {
  await supabase.auth.signOut();
  queryClient.clear();
}
