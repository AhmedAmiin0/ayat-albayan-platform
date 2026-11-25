import eas from '../eas.json';

// The internal APKs stay small: native code for real 64-bit arm phones only, no x86
// emulator ABIs, because every ABI carries its own copy of the WebRTC libraries.

// `channel` too: with only env/android the type is «weak», and development has neither.
interface Profile {
  channel?: string;
  env?: Record<string, string>;
  android?: { buildType?: string };
}
const profiles: Record<string, Profile> = eas.build;

test.each(['preview', 'stripe-test'])('the %s APK builds only the 64-bit arm ABI', (name) => {
  const profile = profiles[name];
  expect(profile?.android?.buildType).toBe('apk');
  expect(profile?.env?.ORG_GRADLE_PROJECT_reactNativeArchitectures).toBe('arm64-v8a');
});
