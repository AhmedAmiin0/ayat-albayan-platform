import { t } from '@/core/lib/i18n/i18n';
import app from '../app.json';

// Owner 2026-10-19 #1: expo-audio played voice notes only. Owner 2026-10-27 reversed it: the chat now
// records voice notes (inbox/composer/voice) through expo-audio's recorder, which is compiled into the
// APK whatever these props say; RECORD_AUDIO reaches the manifest through the webrtc plugin below
// (recordAudioAndroid stays false until the next APK sets it true). Still no background service.
// Owner 2026-10-26 (docs/28 PR 2): in-app WhatsApp voice calls need the microphone, so RECORD_AUDIO is
// no longer blocked: react-native-webrtc's plugin declares it and every plugin that names the
// microphone carries the same MSA rationale (a `false` there would block or delete it again).
// docs/35: the meetings room joins it; the camera and microphone texts name the meetings too.
const plugin = (name: string): unknown =>
  app.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);

test('expo-audio props unchanged (recording rides on the webrtc RECORD_AUDIO; no background service); its iOS microphone text is the shared rationale', () => {
  expect(plugin('expo-audio')).toEqual([
    'expo-audio',
    { microphonePermission: t.mobileRoom.native.mic, recordAudioAndroid: false, enableBackgroundPlayback: false },
  ]);
});

test('the calls and the room: webrtc with the MSA rationales; RECORD_AUDIO is not blocked', () => {
  expect(plugin('@config-plugins/react-native-webrtc')).toEqual([
    '@config-plugins/react-native-webrtc',
    { microphonePermission: t.mobileRoom.native.mic, cameraPermission: t.mobileRoom.native.camera },
  ]);
  expect(app.expo.android.blockedPermissions).not.toContain('android.permission.RECORD_AUDIO');
  // Voice only: the plugin's «draw over other apps» is not needed.
  expect(app.expo.android.blockedPermissions).toEqual(['android.permission.SYSTEM_ALERT_WINDOW']);
});

test('LiveKit (docs/35): its expo plugin with the communication audio type, no screen-share service', () => {
  expect(plugin('@livekit/react-native-expo-plugin')).toEqual([
    '@livekit/react-native-expo-plugin',
    { android: { audioType: 'communication' } },
  ]);
});

test('version 0.4.0, the APK that carries the room (an OTA never reaches the 0.3.0 APK); never forcesRTL', () => {
  expect(app.expo.version).toBe('0.4.0');
  expect(JSON.stringify(app)).not.toContain('forcesRTL');
});
