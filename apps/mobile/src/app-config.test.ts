import app from '../app.json';

// Owner 2026-10-19 #1: expo-audio plays voice notes, it never records. Its config plugin adds
// RECORD_AUDIO on Android unless told not to (microphonePermission only covers iOS), and background
// playback adds a media foreground service the chat does not need.
const plugin = (name: string): unknown =>
  app.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);

test('expo-audio is playback only: no microphone on either OS, no background service', () => {
  expect(plugin('expo-audio')).toEqual([
    'expo-audio',
    { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false },
  ]);
});

test('RECORD_AUDIO stays blocked whatever another plugin adds', () => {
  expect(app.expo.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
});

test('version 0.2.0, the APK that carries the players; never forcesRTL', () => {
  expect(app.expo.version).toBe('0.2.0');
  expect(JSON.stringify(app)).not.toContain('forcesRTL');
});
