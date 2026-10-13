import { supabase } from '@/lib/supabase';

/** Longest one supabase signOut may take before this browser's session is dropped by hand. */
export const SIGN_OUT_TIMEOUT_MS = 3_000;

/**
 * supabase.auth.signOut within SIGN_OUT_TIMEOUT_MS: true only when it answered without an error.
 * A hang (auth lock, dead network), a throw or an answer without its result all count as failed.
 */
async function signOutWithin(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), SIGN_OUT_TIMEOUT_MS);
  });
  const call = (async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return !error;
    } catch {
      return false;
    }
  })();
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Removes the stored session (the client's own storage key, read at runtime) from localStorage. */
function dropStoredSession(): void {
  const key: unknown = Reflect.get(supabase.auth, 'storageKey');
  if (typeof key !== 'string' || !key) return;
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-user`);
  } catch {
    // storage blocked (private mode): nothing was stored there either
  }
}

/**
 * Ends this browser's session, always. With an expired token offline, auth-js answers signOut with
 * { error } and keeps the stored session (its refresh failed), so the browser would stay signed in;
 * on that error or a timeout the stored session is removed and signOut runs once more, which then
 * finds no session and tells the client's listeners SIGNED_OUT. Never throws; at most two timeouts.
 */
export async function endSession(): Promise<void> {
  if (await signOutWithin()) return;
  dropStoredSession();
  await signOutWithin();
}
