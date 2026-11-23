import { AudioModule } from 'expo-audio';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * The APK runtime records: 0.3.0 and later carry RECORD_AUDIO and the camera (app.json, webrtc
 * plugin). runtimeVersion follows the app version; null in a dev build, which records too.
 */
export function runtimeRecords(runtime: string | null | undefined): boolean {
  if (!runtime) return true;
  const [major = 0, minor = 0] = runtime.split('.').map((n) => Number.parseInt(n, 10) || 0);
  return major > 0 || minor >= 3;
}

/** Needs Android, a recording APK runtime and expo-audio's native recorder; else no microphone. */
export function voiceSupported(): boolean {
  try {
    const recorder: unknown = (AudioModule as { AudioRecorder?: unknown } | undefined)?.AudioRecorder;
    return Platform.OS === 'android' && runtimeRecords(Updates.runtimeVersion) && typeof recorder === 'function';
  } catch {
    return false;
  }
}
