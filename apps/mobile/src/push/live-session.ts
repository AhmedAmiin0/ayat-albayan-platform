import { supabase } from '@/lib/supabase';

/**
 * Is someone signed in right now, with an access token that has not expired? getSession refreshes
 * an expired token when it can; offline or revoked it answers no session (or a stale one, refused
 * here). registerPush asks this first: an app started on an expired session never asks for a push
 * token or PUTs one before the user is authenticated again. Never throws.
 */
export async function hasLiveSession(now: number = Date.now()): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const expiresAt = data.session?.expires_at;
    return expiresAt !== undefined && expiresAt * 1000 > now;
  } catch {
    return false;
  }
}
