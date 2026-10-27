import { t } from '@/core/lib/i18n/i18n';
import app from '../app.json';

// Owner 2026-10-19 #1: expo-audio plays voice notes, it never records (no background service either).
// Owner 2026-10-26 (docs/28 PR 2): in-app WhatsApp voice calls need the microphone, so RECORD_AUDIO is
// no longer blocked: react-native-webrtc's plugin declares it and every plugin that names the
// microphone carries the same MSA rationale (a `false` there would block or delete it again).
const plugin = (name: string): unknown =>
  app.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);

test('expo-audio still plays only (no recording, no background service); its iOS microphone text is the calls rationale', () => {
  expect(plugin('expo-audio')).toEqual([
    'expo-audio',
    { microphonePermission: t.calls.mic.rationale, recordAudioAndroid: false, enableBackgroundPlayback: false },
  ]);
});

test('the calls: react-native-webrtc with the MSA microphone rationale; RECORD_AUDIO is not blocked', () => {
  expect(plugin('@config-plugins/react-native-webrtc')).toEqual([
    '@config-plugins/react-native-webrtc',
    { microphonePermission: t.calls.mic.rationale, cameraPermission: t.payments.mobile.cameraRationale },
  ]);
  expect(app.expo.android.blockedPermissions).not.toContain('android.permission.RECORD_AUDIO');
  // Voice only: the plugin's «draw over other apps» is not needed.
  expect(app.expo.android.blockedPermissions).toEqual(['android.permission.SYSTEM_ALERT_WINDOW']);
});

test('version 0.3.0, the APK that carries the calls (an OTA never reaches the 0.2.0 APK); never forcesRTL', () => {
  expect(app.expo.version).toBe('0.3.0');
  expect(JSON.stringify(app)).not.toContain('forcesRTL');
});
