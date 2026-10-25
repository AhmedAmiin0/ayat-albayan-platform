import type { SupabaseClient } from '@supabase/supabase-js';
import { clearTabMemories } from '@/features/inbox/tab-memory';
import { dropLocalWebPush } from './web-push';

/**
 * App-level: whenever the session ends (our sign-out, an expired refresh, another tab signing out),
 * this browser's push subscription goes with it, so it never stays bound to the previous user, and
 * the inbox's tab memories (drafts, own sends, registrations) are forgotten (round 2 D). The same
 * when another person signs in on this browser without a sign-out first (another tab's sign-in):
 * the previous user's subscription is dropped (the server row then answers 404/410 and goes).
 * Returns the unsubscribe of the listener.
 */
export function bindWebPushToSession(
  auth: Pick<SupabaseClient['auth'], 'onAuthStateChange'>,
): () => void {
  let userId: string | null = null;
  const { data } = auth.onAuthStateChange((event, session) => {
    const next = session?.user.id ?? null;
    const switched = event === 'SIGNED_IN' && userId !== null && next !== userId;
    if (event !== 'SIGNED_OUT') userId = next ?? userId;
    else userId = null;
    if (event !== 'SIGNED_OUT' && !switched) return;
    clearTabMemories();
    void dropLocalWebPush();
  });
  return () => data.subscription.unsubscribe();
}
