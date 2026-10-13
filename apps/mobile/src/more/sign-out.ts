import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';

/** A slow network must not trap the admin in the app: give the DELETE this long, then sign out. */
export const UNREGISTER_TIMEOUT_MS = 3000;
/** signOut first refreshes an expired token, retrying for up to ~30 s offline: not that long. */
export const SIGN_OUT_TIMEOUT_MS = 5000;

const TIMED_OUT = Symbol('timed out');

function within<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** True only when Supabase signed this device out itself: no error, no throw, in time. */
async function signedOut(): Promise<boolean> {
  const left = supabase.auth.signOut().then(
    ({ error }) => !error,
    () => false,
  );
  return (await within(left, SIGN_OUT_TIMEOUT_MS)) === true;
}

/**
 * Offline with an expired token (or on an auth 5xx) signOut's refresh fails retryably: it keeps
 * the stored session and returns { error }, and no SIGNED_OUT reaches the gate. Drop the session
 * from the client's storage (AsyncStorage, lib/supabase) under the client's own key; signOut then
 * finds none, clears the rest locally and emits SIGNED_OUT, and the gate shows /login.
 */
async function forgetSession(): Promise<void> {
  const key: unknown = Reflect.get(supabase.auth, 'storageKey');
  if (typeof key === 'string') await AsyncStorage.removeItem(key).catch(() => undefined);
  await within(supabase.auth.signOut().catch(() => undefined), SIGN_OUT_TIMEOUT_MS);
}

/**
 * «تسجيل الخروج»: this device's push token off the profile first (the DELETE needs the session),
 * then sign out. It always leaves this device: a failed or hung signOut forgets the session here.
 * The auth gate clears both caches and shows /login (use-auth-gate).
 */
export async function signOutDevice(): Promise<void> {
  await within(unregisterPush(), UNREGISTER_TIMEOUT_MS);
  if (await signedOut()) return;
  await forgetSession();
}
