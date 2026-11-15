import eas from '../eas.json';

// Owner 2026-10-31 («the app size is 170 mb»): the internal APKs carry native code for
// real phones only, not the x86 emulator ABIs: every ABI carries its own copy of the
// WebRTC libraries. Owner 2026-11-01 («make the app smaller», option 1): 64-bit arm only.

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
