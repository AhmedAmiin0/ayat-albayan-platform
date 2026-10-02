import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { t } from '@/lib/i18n';

const m = t.payments.mobile;

/** The OS prompt takes no custom text, so the Arabic reason comes first, in our own alert. */
function confirmRationale(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      m.cameraTitle,
      m.cameraRationale,
      [
        { text: t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: m.takePhoto, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Refused for good earlier: only the phone's settings can open the camera again. */
function explainDenied(): false {
  Alert.alert(m.cameraTitle, m.cameraDenied, [
    { text: t.common.close, style: 'cancel' },
    { text: m.openSettings, onPress: () => void Linking.openSettings() },
  ]);
  return false;
}

/**
 * true when the camera may open (R-MOB-02 receipt photo). Already granted: no question. Never asked:
 * the Arabic rationale, then the system prompt. Refused for good: say where to turn it back on.
 * The gallery needs none of this (the system photo picker asks nothing).
 */
export async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return explainDenied();
  if (!(await confirmRationale())) return false;
  return (await ImagePicker.requestCameraPermissionsAsync()).granted;
}
