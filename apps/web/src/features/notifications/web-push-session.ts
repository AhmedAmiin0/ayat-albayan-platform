import type { SupabaseClient } from '@supabase/supabase-js';
import { dropLocalWebPush } from './web-push';

/**
 * App-level: whenever the session ends (our sign-out, an expired refresh, another tab signing out),
 * this browser's push subscription goes with it, so it never stays bound to the previous user.
 * Returns the unsubscribe of the listener.
 */
export function bindWebPushToSession(
  auth: Pick<SupabaseClient['auth'], 'onAuthStateChange'>,
): () => void {
  const { data } = auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') void dropLocalWebPush();
  });
  return () => data.subscription.unsubscribe();
}
