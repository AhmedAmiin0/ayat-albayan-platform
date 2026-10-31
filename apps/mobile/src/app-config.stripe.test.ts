import { STRIPE_TEST_APP_PACKAGE } from '@ab/shared';
import type { ExpoConfig } from 'expo/config';
import app from '../app.json';
import eas from '../eas.json';
import appConfig from '../app.config';

// Owner 2026-10-28 (docs/30): Stripe exists ONLY in the test build. EXPO_PUBLIC_FEATURE_STRIPE is inlined at
// bundle time, so a profile that sets it ships the Stripe UI; only `stripe-test` may. Its APP_VARIANT makes a
// separate app (own package, own name) installable beside the normal one, on its own update channel.

type Profile = { channel?: string; environment?: string; distribution?: string; env?: Record<string, string>; android?: { buildType?: string } };
const profiles: Record<string, Profile> = eas.build;

const configFor = (variant: string | undefined): ExpoConfig => {
  const before = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  try {
    // app.json read as Expo reads it (its JSON strings are wider than ExpoConfig's unions).
    const config = JSON.parse(JSON.stringify(app.expo)) as ExpoConfig;
    const context = { projectRoot: '.', staticConfigPath: null, packageJsonPath: null, config };
    return appConfig(context);
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = before;
  }
};

test.each(['development', 'preview', 'production'])('the %s profile never turns Stripe on nor builds the test variant', (name) => {
  const profile = profiles[name];
  expect(profile).toBeDefined();
  expect(profile?.env?.EXPO_PUBLIC_FEATURE_STRIPE).toBeUndefined();
  expect(profile?.env?.APP_VARIANT).not.toBe('stripetest');
  expect(profile?.channel).not.toBe('stripe-test');
});

test('only the stripe-test profile sets the flag; an internal APK on its own channel, pointed at staging', () => {
  expect(profiles['stripe-test']).toEqual({
    distribution: 'internal',
    channel: 'stripe-test',
    android: { buildType: 'apk' },
    // Owner 2026-10-31: Stripe on STAGING only (docs/09): its hosts, its EAS environment.
    environment: 'development',
    env: {
      EXPO_PUBLIC_FEATURE_STRIPE: '1',
      APP_VARIANT: 'stripetest',
      EXPO_PUBLIC_API_URL: 'https://staging-api.ayatalbayan.com',
      EXPO_PUBLIC_SUPABASE_URL: 'https://gqkqbxxgqttfbbqoqedf.supabase.co',
      EXPO_PUBLIC_WEB_ORIGIN: 'https://staging-app.ayatalbayan.com',
    },
    node: eas.build.preview.node,
    pnpm: eas.build.preview.pnpm,
  });
  const flagged = Object.entries(profiles).filter(([, p]) => p.env?.EXPO_PUBLIC_FEATURE_STRIPE !== undefined);
  expect(flagged.map(([name]) => name)).toEqual(['stripe-test']);
});

test('APP_VARIANT=stripetest: the .stripetest ids and the test name; nothing else changes', () => {
  const normal = configFor(undefined);
  const test = configFor('stripetest');
  expect(test.android?.package).toBe(`${app.expo.android.package}.stripetest`);
  expect(test.ios?.bundleIdentifier).toBe(`${app.expo.ios.bundleIdentifier}.stripetest`);
  expect(test.name).toBe('Ayat – Stripe test');
  // The API's pay page names this package to bring the payer back into the test app (pay-return.ts).
  expect(test.android?.package).toBe(STRIPE_TEST_APP_PACKAGE);
  expect({ ...test, name: normal.name, android: normal.android, ios: normal.ios }).toEqual(normal);
});

test('the default config is app.json’s (plus the FCM file)', () => {
  const normal = configFor(undefined);
  expect(normal.name).toBe(app.expo.name);
  expect(normal.android?.package).toBe(app.expo.android.package);
  expect(normal.ios?.bundleIdentifier).toBe(app.expo.ios.bundleIdentifier);
  expect(configFor('preview').android?.package).toBe(app.expo.android.package);
});

const FCM_FILE = (): string => process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';

test('the normal config is exactly app.json plus the Firebase file (the stripe-test variant changed nothing)', () => {
  const expected = { ...app.expo, android: { ...app.expo.android, googleServicesFile: FCM_FILE() } };
  expect(configFor(undefined)).toStrictEqual(expected);
  expect(configFor('preview')).toStrictEqual(expected);
  expect(JSON.stringify(configFor(undefined))).toBe(JSON.stringify(expected));
});

test('the stripe-test variant has no googleServicesFile (no FCM push); the rest of android is the normal one', () => {
  const normal = configFor(undefined);
  const android = configFor('stripetest').android ?? {};
  expect('googleServicesFile' in android).toBe(false);
  expect(normal.android?.googleServicesFile).toBe(FCM_FILE());
  const { googleServicesFile, ...rest } = normal.android ?? {};
  expect(googleServicesFile).toBeDefined();
  expect(android).toStrictEqual({ ...rest, package: `${app.expo.android.package}.stripetest` });
});
