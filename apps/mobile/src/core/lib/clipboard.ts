import { Clipboard, Share } from 'react-native';

/**
 * Puts `text` on the phone's clipboard; false when the native module is missing or throws.
 * The installed APK still registers React Native core's clipboard module (Android ClipboardModule,
 * iOS RCTClipboard), so this ships by OTA with no native change.
 */
export function copyToClipboard(text: string): boolean {
  try {
    // ponytail: RN core Clipboard is deprecated; swap to expo-clipboard when APK 0.3.0 ships it (#272).
    Clipboard.setString(text);
    return true;
  } catch {
    return false;
  }
}

export type CopyResult = 'copied' | 'shared' | 'failed';

/** Copy, else hand the text to the share sheet (it has Copy); 'failed' when both fail. */
export async function copyOrShare(text: string): Promise<CopyResult> {
  if (copyToClipboard(text)) return 'copied';
  try {
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
