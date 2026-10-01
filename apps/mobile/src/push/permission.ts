import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { t } from '@/lib/i18n';

/** Set the first time we ask, whatever the answer: the admin is asked once, ever. */
export const ASKED_KEY = 'push.asked';

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
 * we never asked and the OS still lets us: the rationale, then the system prompt (R-MOB-01).
 */
export async function ensurePushPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain || (await AsyncStorage.getItem(ASKED_KEY))) return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  if (!(await confirmRationale())) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}
