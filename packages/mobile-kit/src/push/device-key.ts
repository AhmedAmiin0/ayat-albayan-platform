import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushTokenCalls } from '@ab/client-core';
import { ApiError, apiFetch, apiSend } from '../lib/http/api';
import { silencePush } from './silence-push';

/** The token this device put on the profile, so sign-out removes exactly it (survives restarts). */
export const TOKEN_KEY = 'push.token';
/**
 * The key the API handed this device with its last registration (migration 720). It proves to the
 * API that a PUT comes from this very phone, so a token bound to someone else's live session moves
 * only for it (a handed-over phone); sign-out keeps it. Never the token alone.
 */
export const DEVICE_KEY = 'push.deviceKey';

/** PUT and DELETE /me/push-tokens on the app's api client. */
export const pushTokens = pushTokenCalls({ apiFetch, apiSend });

/**
 * PUT /me/push-tokens with this device's key, then keeps the token and the key answered. A 409 is
 * the token still bound to another person's live session (an old phone whose sign-out never reached
 * the API, without its key): the OS stops delivering here (silencePush), so this phone never shows
 * that person's alerts; the next start asks again. Other failures throw (registerPush says why).
 */
export async function putPushToken(token: string): Promise<void> {
  const deviceKey = await AsyncStorage.getItem(DEVICE_KEY);
  let res: { deviceKey: string };
  try {
    res = await pushTokens.add(deviceKey ? { token, deviceKey } : { token });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 409)) throw error;
    await silencePush();
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(DEVICE_KEY, res.deviceKey);
}

// docs/50 §6: off keeps this device out of pushes across restarts; the staff app never sets it.

export const PUSH_OPT_OUT_KEY = 'push.optOut';

/** Has the person switched pushes off on this device? Unreadable storage counts as «on». */
export async function pushOptedOut(): Promise<boolean> {
  return (await AsyncStorage.getItem(PUSH_OPT_OUT_KEY).catch(() => null)) === '1';
}

const WRITE: Record<'on' | 'off', () => Promise<void>> = {
  on: () => AsyncStorage.removeItem(PUSH_OPT_OUT_KEY),
  off: () => AsyncStorage.setItem(PUSH_OPT_OUT_KEY, '1'),
};

/** Remembers the switch (registerPush then skips this device while it is off). */
export function setPushOptOut(off: boolean): Promise<void> {
  return WRITE[off ? 'off' : 'on']();
}
