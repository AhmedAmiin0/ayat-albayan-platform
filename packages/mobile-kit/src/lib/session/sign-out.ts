import { supabase } from '../http/supabase';
import { unregisterPush } from '../../push/registerPush';
import { silencePush } from '../../push/silence-push';

/** A slow network must not trap the admin in the app: give the DELETE this long, then sign out. */
export const UNREGISTER_TIMEOUT_MS = 3000;

function within(work: Promise<void>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** Push token off the profile first (DELETE needs the session), then off the OS, then sign out. */
export async function signOutDevice(): Promise<void> {
  await within(unregisterPush(), UNREGISTER_TIMEOUT_MS);
  await within(silencePush(), UNREGISTER_TIMEOUT_MS);
  await supabase.auth.signOut();
}
