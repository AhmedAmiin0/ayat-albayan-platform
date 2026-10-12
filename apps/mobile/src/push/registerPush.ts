import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ApiError, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ensurePushPermission } from './permission';

// R-MOB-01 registration. The API sends the pushes (common/push, one per event per admin);
// useNotificationHandling shows them in the foreground and opens their screen on a tap.

/** The token this device put on the profile, so sign-out removes exactly it (survives restarts). */
export const TOKEN_KEY = 'push.token';
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
    await apiSend('PUT', '/me/push-tokens', { token });
    await AsyncStorage.setItem(TOKEN_KEY, token);
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
 * needs the session's bearer. Never throws; offline, the token stays until a later sign-out.
 * TODO(R-MOB-01): a 401-forced sign-out skips this; sending will prune DeviceNotRegistered tokens.
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
