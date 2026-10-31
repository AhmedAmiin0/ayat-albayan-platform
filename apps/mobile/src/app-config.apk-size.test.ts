import eas from '../eas.json';

// Owner 2026-10-31 («the app size is 170 mb»): the internal APKs carry native code for
// real phones only (arm64 + 32-bit arm), not the x86 emulator ABIs: every ABI carries
// its own copy of the WebRTC libraries.

// `channel` too: with only env/android the type is «weak», and development has neither.
interface Profile {
  channel?: string;
  env?: Record<string, string>;
  android?: { buildType?: string };
}
const profiles: Record<string, Profile> = eas.build;

test.each(['preview', 'stripe-test'])('the %s APK builds only the arm ABIs', (name) => {
  const profile = profiles[name];
  expect(profile?.android?.buildType).toBe('apk');
  expect(profile?.env?.ORG_GRADLE_PROJECT_reactNativeArchitectures).toBe('arm64-v8a,armeabi-v7a');
});
