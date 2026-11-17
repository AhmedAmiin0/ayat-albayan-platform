import type { AndroidConfig } from 'expo/config-plugins';

import { blockAudioCapture } from './app.plugin';

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Application = AndroidConfig.Manifest.ManifestApplication;

const KEY = 'android:allowAudioPlaybackCapture';

// The parsed shape of the Expo SDK 57 template's AndroidManifest.xml (the parts around the edit).
const manifest = (): Manifest => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
    queries: [{ intent: [{ action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }] }] }],
    application: [
      {
        $: {
          'android:name': '.MainApplication',
          'android:label': '@string/app_name',
          'android:allowBackup': 'false',
        },
        activity: [{ $: { 'android:name': '.MainActivity', 'android:exported': 'true' } }],
      },
    ],
  },
});

/** The first <application>, or a failed test. */
function appOf(m: Manifest): Application {
  const [app] = m.manifest.application ?? [];
  if (!app) throw new Error('no <application>');
  return app;
}

test('opts the app out of Android audio playback capture', () => {
  expect(appOf(blockAudioCapture(manifest())).$[KEY]).toBe('false');
});

test('changes nothing else in the manifest and does not mutate its input', () => {
  const before = manifest();
  const out = blockAudioCapture(before);
  const { [KEY]: added, ...attrs } = appOf(out).$;
  expect(added).toBe('false');
  expect(attrs).toEqual(appOf(before).$);
  const expected = manifest();
  appOf(expected).$[KEY] = 'false';
  expect(out).toEqual(expected);
  expect(before).toEqual(manifest());
});

test('is idempotent (a second prebuild changes nothing)', () => {
  const once = blockAudioCapture(manifest());
  expect(blockAudioCapture(once)).toEqual(once);
});

test('overrides a capture opt-in another plugin may have set', () => {
  const opted = manifest();
  appOf(opted).$[KEY] = 'true';
  expect(appOf(blockAudioCapture(opted)).$[KEY]).toBe('false');
});

test('fails the build loudly when the manifest has no <application>', () => {
  const bare: Manifest = { manifest: { $: { 'xmlns:android': 'x' }, queries: [] } };
  expect(() => blockAudioCapture(bare)).toThrow(/application/);
});
