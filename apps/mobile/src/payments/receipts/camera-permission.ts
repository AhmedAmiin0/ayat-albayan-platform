import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';

const m = t.payments.mobile;

/** Why the camera is needed and the button that opens it; the receipt's by default. */
interface CameraCopy {
  rationale: string;
  confirm: string;
}

const RECEIPT_COPY: CameraCopy = { rationale: m.cameraRationale, confirm: m.takePhoto };

/** The OS prompt takes no custom text, so the Arabic reason comes first, in our own alert. */
function confirmRationale(copy: CameraCopy): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      m.cameraTitle,
      copy.rationale,
      [
        { text: t.common.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: copy.confirm, onPress: () => resolve(true) },
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
 * The gallery needs none of this (the system photo picker asks nothing). The avatar passes its own copy.
 */
export async function ensureCameraPermission(copy: CameraCopy = RECEIPT_COPY): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return explainDenied();
  if (!(await confirmRationale(copy))) return false;
  return (await ImagePicker.requestCameraPermissionsAsync()).granted;
}
