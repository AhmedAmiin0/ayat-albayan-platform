import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';
import { silencePush } from '@/push/silence-push';

/** A slow network must not trap the admin in the app: give the DELETE this long, then sign out. */
export const UNREGISTER_TIMEOUT_MS = 3000;

function within(work: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * «تسجيل الخروج»: this device's push token off the profile first (the DELETE needs the session),
 * then this app off the OS push service (an offline sign-out never ends the server session), then
 * sign out. The auth gate clears both caches and shows /login (use-auth-gate).
 */
export async function signOutDevice(): Promise<void> {
  await within(unregisterPush(), UNREGISTER_TIMEOUT_MS);
  await within(silencePush(), UNREGISTER_TIMEOUT_MS);
  await supabase.auth.signOut();
}
