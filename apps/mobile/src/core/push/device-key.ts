import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { silencePush } from './silence-push';

/** The token this device put on the profile, so sign-out removes exactly it (survives restarts). */
export const TOKEN_KEY = 'push.token';
/**
 * The key the API handed this device with its last registration (migration 720). It proves to the
 * API that a PUT comes from this very phone, so a token bound to someone else's live session moves
 * only for it (a handed-over phone); sign-out keeps it. Never the token alone.
 */
export const DEVICE_KEY = 'push.deviceKey';

/**
 * PUT /me/push-tokens with this device's key, then keeps the token and the key answered. A 409 is
 * the token still bound to another person's live session (an old phone whose sign-out never reached
 * the API, without its key): the OS stops delivering here (silencePush), so this phone never shows
 * that person's alerts; the next start asks again. Other failures throw (registerPush says why).
 */
export async function putPushToken(token: string): Promise<void> {
  const deviceKey = await AsyncStorage.getItem(DEVICE_KEY);
  let res: { deviceKey?: string } | undefined;
  try {
    res = await apiSend<{ deviceKey?: string } | undefined>('PUT', '/me/push-tokens', deviceKey ? { token, deviceKey } : { token });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 409)) throw error;
    await silencePush();
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (res?.deviceKey) await AsyncStorage.setItem(DEVICE_KEY, res.deviceKey);
}
