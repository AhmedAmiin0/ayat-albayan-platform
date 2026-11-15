import { noAnswer } from '@ab/client-core';
import { supabase } from './supabase';

/**
 * The session's token, or null when signed out. A refresh that failed (no network at resume) leaves
 * an error and no session: that is no answer, not a sign-out (a request without a token would get
 * a 401, and signOutOnAuthError would sign the user out over a network stall).
 */
export async function accessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw noAnswer();
  return data.session?.access_token ?? null;
}
