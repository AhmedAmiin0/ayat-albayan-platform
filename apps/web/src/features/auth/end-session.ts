import { supabase } from '@/lib/supabase';

/** Longest one sign-out step (revoking the token, then signing out locally) may take. */
export const SIGN_OUT_TIMEOUT_MS = 3_000;

/**
 * Awaits `work` for at most SIGN_OUT_TIMEOUT_MS. Never throws: an { error } answer, a throw and a
 * hang are all left behind, so only work that is harmless when it finishes later belongs here.
 */
async function settleWithin(work: () => Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, SIGN_OUT_TIMEOUT_MS);
  });
  const call = (async () => {
    try {
      await work();
    } catch {
      // the next step runs regardless
    }
  })();
  try {
    await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** The client's own storage key, read at runtime (auth-js derives it from the project URL). */
function storageKeyOf(): string | null {
  const key: unknown = Reflect.get(supabase.auth, 'storageKey');
  return typeof key === 'string' && key ? key : null;
}

/** The stored access token while it is still valid (auth-js keeps expires_at in seconds), else null. */
function liveAccessToken(key: string): string | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (typeof stored !== 'object' || stored === null) return null;
    if (!('access_token' in stored) || !('expires_at' in stored)) return null;
    const { access_token: token, expires_at: expiresAt } = stored;
    if (typeof token !== 'string' || typeof expiresAt !== 'number') return null;
    return expiresAt * 1000 > Date.now() ? token : null;
  } catch {
    return null; // storage blocked or not JSON: nothing usable to revoke
  }
}

/** Removes the stored session (and its user copy) from localStorage. */
function dropStoredSession(key: string): void {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-user`);
  } catch {
    // storage blocked (private mode): nothing was stored there either
  }
}

/**
 * Ends this browser's session, always, and never anyone else's. supabase.auth.signOut is never
 * handed a session: it refreshes an expired token first (retrying for ~25 s offline) and keeps the
 * stored session on failure, and a call left behind at the timeout would finish later against
 * whatever is stored then, possibly the next person's session, which it would revoke everywhere.
 * So the stored token, while still valid, is revoked by itself (admin.signOut with that token: the
 * same /logout auth-js sends, touching no storage, so if it finishes late it can only sign out the
 * user who asked to leave); the stored session is then removed, and signOut finds none: it makes no
 * request, clears the rest and tells the client's listeners SIGNED_OUT. At most two timeouts.
 */
export async function endSession(): Promise<void> {
  const key = storageKeyOf();
  if (key) {
    const token = liveAccessToken(key);
    if (token) await settleWithin(() => supabase.auth.admin.signOut(token));
    dropStoredSession(key);
  }
  await settleWithin(() => supabase.auth.signOut());
}
