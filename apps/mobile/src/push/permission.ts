import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';

/** When the rationale was last shown (epoch ms), whatever the answer. */
export const ASKED_KEY = 'push.asked';
/** «مش دلوقتي» means later, not never: the rationale comes back a week on. */
export const ASK_AGAIN_MS = 7 * 24 * 60 * 60 * 1000;

async function askedRecently(): Promise<boolean> {
  const at = Number(await AsyncStorage.getItem(ASKED_KEY)); // null → 0; the old '1' → long ago
  return Date.now() - at < ASK_AGAIN_MS;
}

/** Neither OS prompt takes custom text, so the Arabic reason comes first, in our own alert. */
function confirmRationale(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      t.mobile.pushTitle,
      t.mobile.pushRationale,
      [
        { text: t.mobile.pushLater, style: 'cancel', onPress: () => resolve(false) },
        { text: t.mobile.pushAllow, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * true when notifications are allowed. Already granted → true without asking. Otherwise, only if
 * we haven't asked this week and the OS still lets us: the rationale, then the system prompt
 * (R-MOB-01). Once the system prompt is refused, the OS stops us; the phone's settings remain.
 */
export async function ensurePushPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain || (await askedRecently())) return false;
  await AsyncStorage.setItem(ASKED_KEY, String(Date.now()));
  if (!(await confirmRationale())) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
