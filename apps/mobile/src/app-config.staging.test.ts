import type { ExpoConfig } from 'expo/config';
import app from '../app.json';
import eas from '../eas.json';
import appConfig from '../app.config';

// Owner 2026-10-31 (docs/09 «Staging»): a staging app beside the production one. Its eas.json
// profile points at STAGING only; the production profiles (preview = the phones in use,
// production) never name a staging host.

interface Profile {
  channel?: string;
  environment?: string;
  env?: Record<string, string>;
}
const profiles: Record<string, Profile> = eas.build;
const STAGING = {
  EXPO_PUBLIC_API_URL: 'https://staging-api.ayatalbayan.com',
  EXPO_PUBLIC_SUPABASE_URL: 'https://gqkqbxxgqttfbbqoqedf.supabase.co',
  EXPO_PUBLIC_WEB_ORIGIN: 'https://staging-app.ayatalbayan.com',
};

const configFor = (variant: string): ExpoConfig => {
  const before = process.env.APP_VARIANT;
  process.env.APP_VARIANT = variant;
  try {
    const config = JSON.parse(JSON.stringify(app.expo)) as ExpoConfig;
    return appConfig({ projectRoot: '.', staticConfigPath: null, packageJsonPath: null, config });
  } finally {
    if (before === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = before;
  }
};

test('the staging profile: its own channel, the EAS development environment, staging hosts only', () => {
  expect(profiles['staging']).toEqual({
    distribution: 'internal',
    channel: 'staging',
    android: { buildType: 'apk' },
    environment: 'development',
    env: { APP_VARIANT: 'staging', ...STAGING },
    node: eas.build.preview.node,
    pnpm: eas.build.preview.pnpm,
  });
  expect(profiles['staging']?.env?.EXPO_PUBLIC_FEATURE_STRIPE).toBeUndefined();
});

test('the production profiles never point at staging, nor share its channel', () => {
  for (const name of ['preview', 'production']) {
    const profile = profiles[name];
    expect(JSON.stringify(profile)).not.toMatch(/staging|gqkqbxxgqttfbbqoqedf/);
    expect(profile?.environment).toBe(name);
  }
});

test('APP_VARIANT=staging: the .staging ids, its own name, no Firebase file; the rest is the normal app', () => {
  const staging = configFor('staging');
  expect(staging.android?.package).toBe(`${app.expo.android.package}.staging`);
  expect(staging.ios?.bundleIdentifier).toBe(`${app.expo.ios.bundleIdentifier}.staging`);
  expect(staging.name).toBe('آيات البيان (تجريبي)');
  expect('googleServicesFile' in (staging.android ?? {})).toBe(false);
  const normal = configFor('');
  const { googleServicesFile, ...android } = normal.android ?? {};
  expect(googleServicesFile).toBeDefined();
  expect(staging.android).toStrictEqual({ ...android, package: `${app.expo.android.package}.staging` });
  const rest = { ...staging, name: normal.name, android: normal.android, ios: normal.ios };
  expect(rest).toEqual(normal);
});

test('an unknown APP_VARIANT is the normal app', () => {
  expect(configFor('constructor')).toStrictEqual(configFor(''));
});
