import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { z } from 'zod';
import { ApiError, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { putPushToken, TOKEN_KEY } from './device-key';
import { hasLiveSession } from './live-session';
import { ensurePushPermission } from './permission';
import { silenceSettled } from './silence-push';

// R-MOB-01 registration. The API sends the pushes (common/push, one per event per admin);
// useNotificationHandling shows them in the foreground and opens their screen on a tap.

export { DEVICE_KEY, TOKEN_KEY } from './device-key';

/** Matches the expo-notifications config plugin's defaultChannel in app.json. */
export const ANDROID_CHANNEL = 'default';

/** app.json `extra`: only `eas.projectId` matters, the rest passes through. */
const extraSchema = z.looseObject({ eas: z.looseObject({ projectId: z.string().min(1) }) });

/** app.json `extra.eas.projectId` (EAS project @holdmycup/ayat-albayan-admin); null if unlinked. */
export function easProjectId(extra: unknown): string | null {
  const parsed = extraSchema.safeParse(extra);
  return parsed.success ? parsed.data.eas.projectId : null;
}

/** A real device, an EAS project and a live session (never prompt or PUT before sign-in). */
async function pushProjectId(): Promise<string | null> {
  const projectId = Device.isDevice ? easProjectId(Constants.expoConfig?.extra) : null;
  return projectId && (await hasLiveSession()) ? projectId : null;
}

/** Per platform, what the prompt needs first: Android 13+ prompts only once a channel exists. */
const CHANNEL_SETUP: Partial<Record<typeof Platform.OS, () => Promise<unknown>>> = {
  android: () =>
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: t.mobile.pushChannel,
      importance: Notifications.AndroidImportance.HIGH,
    }),
};

/** Permission (re-asked weekly) → Expo push token → PUT /me/push-tokens. */
async function tokenToApi(projectId: string): Promise<void> {
  if (!(await ensurePushPermission())) return;
  // A sign-out's OS unregister still running (slow network) would kill the token fetched next.
  await silenceSettled();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await putPushToken(token);
}

/** A 403 is a role without notifications.push (sales, a classroom assistant): expected. */
const isForbidden = (error: unknown): boolean => error instanceof ApiError && error.status === 403;

/**
 * On every admin start: real device + EAS project + permission (re-asked weekly) → Expo push token →
 * PUT /me/push-tokens (idempotent). Best effort: Expo Go, offline or a refused prompt skip silently
 * and the next start tries again. Never throws.
 */
export async function registerPush(): Promise<void> {
  const projectId = await pushProjectId();
  if (!projectId) return;
  try {
    await CHANNEL_SETUP[Platform.OS]?.();
    await tokenToApi(projectId);
  } catch (error) {
    // Push is a convenience: no error UI. The next start registers again. A dev build says why
    // (an Android build without android.googleServicesFile never gets a token); a 403 is expected,
    // so not even a warning.
    if (__DEV__ && !isForbidden(error)) console.warn('registerPush', error);
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
