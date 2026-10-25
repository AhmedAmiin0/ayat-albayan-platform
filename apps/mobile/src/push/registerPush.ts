import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ApiError, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { putPushToken, TOKEN_KEY } from './device-key';
import { hasLiveSession } from './live-session';
import { ensurePushPermission } from './permission';

// R-MOB-01 registration. The API sends the pushes (common/push, one per event per admin);
// useNotificationHandling shows them in the foreground and opens their screen on a tap.

export { DEVICE_KEY, TOKEN_KEY } from './device-key';

/** Matches the expo-notifications config plugin's defaultChannel in app.json. */
export const ANDROID_CHANNEL = 'default';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** app.json `extra.eas.projectId` (EAS project @holdmycup/ayat-albayan-admin); null if unlinked. */
export function easProjectId(extra: unknown): string | null {
  const eas = isRecord(extra) ? extra['eas'] : undefined;
  const id = isRecord(eas) ? eas['projectId'] : undefined;
  return typeof id === 'string' && id ? id : null;
}

/**
 * On every admin start: real device + EAS project + permission (re-asked weekly) → Expo push token →
 * PUT /me/push-tokens (idempotent). Best effort: Expo Go, offline or a refused prompt skip silently
 * and the next start tries again. Never throws.
 */
export async function registerPush(): Promise<void> {
  if (!Device.isDevice) return;
  const projectId = easProjectId(Constants.expoConfig?.extra);
  if (!projectId) return;
  // Never before the user is authenticated (a cold start on an expired session): no prompt, no PUT.
  if (!(await hasLiveSession())) return;
  try {
    if (Platform.OS === 'android') {
      // Android 13+ shows the permission prompt only once a channel exists.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: t.mobile.pushChannel,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    if (!(await ensurePushPermission())) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await putPushToken(token);
  } catch (error) {
    // Push is a convenience: no error UI. The next start registers again. A dev build says why
    // (an Android build without android.googleServicesFile never gets a token). A 403 is a role
    // without notifications.push (sales, a classroom assistant): expected, so not even a warning.
    if (error instanceof ApiError && error.status === 403) return;
    if (__DEV__) console.warn('registerPush', error);
  }
}

/**
 * Takes this device's token off the profile. Call it BEFORE supabase.auth.signOut(): the DELETE
 * needs the session's bearer. Never throws. When it fails (offline, timeout) sign-out also silences
 * the OS (silence-push); a session ended on the server drops the token too (migration 700).
 */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await apiSend('DELETE', `/me/push-tokens/${encodeURIComponent(token)}`);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Kept locally, so the next sign-out retries.
  }
}
