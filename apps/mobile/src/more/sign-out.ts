import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';

/** getSession refreshes an expired token first, retrying for up to ~30 s offline: not that long. */
export const SESSION_TIMEOUT_MS = 3000;
/** A slow network must not trap the user in the app: the push-token DELETE is aborted after this. */
export const UNREGISTER_TIMEOUT_MS = 3000;
/** Ending the session on the server (POST /logout) gets this long; the device is left either way. */
export const SIGN_OUT_TIMEOUT_MS = 5000;

const TIMED_OUT = Symbol('timed out');

function within<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The leaving session's access token, or null without one in time. What getSession answers after
 * the timeout is ignored, and the refresh it may leave running cannot store anything once the
 * session is gone (auth-js's commit guard discards it).
 */
async function leavingToken(): Promise<string | null> {
  const read = supabase.auth.getSession().then(
    ({ data }) => data.session?.access_token ?? null,
    () => null,
  );
  const token = await within(read, SESSION_TIMEOUT_MS);
  return typeof token === 'string' ? token : null;
}

/**
 * Ends that one session on the server. Network only, by its own token and scope 'local': left
 * running past the timeout it can still end only that session, never a later sign-in (not even
 * by the same account, as 'global' would). Not supabase.auth.signOut(): that one acts on whatever
 * session is stored when its request returns, which by then may be the next user's.
 */
async function revoke(jwt: string): Promise<void> {
  const ended = supabase.auth.admin.signOut(jwt, 'local').catch(() => undefined);
  await within(ended, SIGN_OUT_TIMEOUT_MS);
}

/**
 * Drops the session from this device: removed from the client's storage (AsyncStorage,
 * lib/supabase) under the client's own key, read at runtime (the key itself never changes), then
 * signOut finds no session, so it sends nothing, clears the rest and emits SIGNED_OUT.
 */
async function forgetSession(): Promise<void> {
  const key: unknown = Reflect.get(supabase.auth, 'storageKey');
  if (typeof key === 'string') await AsyncStorage.removeItem(key).catch(() => undefined);
  await within(supabase.auth.signOut({ scope: 'local' }).catch(() => undefined), SIGN_OUT_TIMEOUT_MS);
}

/**
 * «تسجيل الخروج»: this device's push token off the profile first, then the session ended on the
 * server, both with the leaving session's own token and bounded; then it is dropped here. It always
 * leaves this device, and nothing it leaves running can reach a later sign-in. The auth gate clears
 * both caches and shows /login on the SIGNED_OUT (use-auth-gate).
 */
export async function signOutDevice(): Promise<void> {
  const jwt = await leavingToken();
  if (jwt) {
    await unregisterPush(jwt, UNREGISTER_TIMEOUT_MS);
    await revoke(jwt);
  }
  await forgetSession();
}
