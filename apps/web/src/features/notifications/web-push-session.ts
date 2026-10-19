import type { SupabaseClient } from '@supabase/supabase-js';
import { clearTabMemories } from '@/features/inbox/tab-memory';
import { dropLocalWebPush } from './web-push';

/**
 * App-level: whenever the session ends (our sign-out, an expired refresh, another tab signing out),
 * this browser's push subscription goes with it, so it never stays bound to the previous user, and
 * the inbox's tab memories (drafts, own sends, registrations) are forgotten (round 2 D).
 * Returns the unsubscribe of the listener.
 */
export function bindWebPushToSession(
  auth: Pick<SupabaseClient['auth'], 'onAuthStateChange'>,
): () => void {
  const { data } = auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return;
    clearTabMemories();
    void dropLocalWebPush();
  });
  return () => data.subscription.unsubscribe();
}
