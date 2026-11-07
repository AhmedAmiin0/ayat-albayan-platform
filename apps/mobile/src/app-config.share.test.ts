import type { ExpoConfig } from 'expo/config';
import app from '../app.json';
import appConfig from '../app.config';
import pkg from '../package.json';

// docs/38: Android's share sheet → «مشاركة إلى…». Intent filters live in the APK, so the types are
// the owner's v1 decision (text and links, photos, PDFs; no video, audio or */*).
const name = (p: unknown): unknown => (Array.isArray(p) ? p[0] : p);
const sharing = (plugins: ExpoConfig['plugins']) => plugins?.find((p) => name(p) === 'expo-sharing');

const configFor = (variant: string | undefined): ExpoConfig => {
  const before = process.env.APP_VARIANT;
  process.env.APP_VARIANT = variant ?? '';
  try {
    const config = JSON.parse(JSON.stringify(app.expo)) as ExpoConfig;
    return appConfig({ projectRoot: '.', staticConfigPath: null, packageJsonPath: null, config });
  } finally {
    process.env.APP_VARIANT = before ?? '';
  }
};

test('expo-sharing receives exactly the v1 types on Android; iOS stays off', () => {
  expect(sharing(configFor(undefined).plugins)).toEqual([
    'expo-sharing',
    {
      android: {
        enabled: true,
        singleShareMimeTypes: ['text/plain', 'image/*', 'application/pdf'],
        multipleShareMimeTypes: ['image/*', 'application/pdf'],
      },
    },
  ]);
});

test('the Stripe test app is no share target (one «آيات» in the share sheet)', () => {
  expect(sharing(configFor('stripetest').plugins)).toEqual(['expo-sharing', { android: { enabled: false } }]);
});

test('the share-intent and OkHttp plugins are both listed; expo-sharing comes after expo-video', () => {
  const names = app.expo.plugins.map(name);
  expect(names).toContain('./plugins/okhttp-timeouts/app.plugin.ts');
  expect(names.indexOf('./plugins/share-intent/app.plugin.ts')).toBeGreaterThan(names.indexOf('expo-sharing'));
  expect(names.indexOf('expo-sharing')).toBeGreaterThan(names.indexOf('expo-video'));
});

test('BLOCKING (docs/38 correction 1): expo-sharing builds from source (its patch compiles)', () => {
  // Without it Gradle links the prebuilt AAR (local-maven-repo) and ignores the patched Kotlin.
  expect(pkg.expo.autolinking.android.buildFromSource).toContain('expo-sharing');
});
