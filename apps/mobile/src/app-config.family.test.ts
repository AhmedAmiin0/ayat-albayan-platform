import type { ExpoConfig } from 'expo/config';
import app from '../app.json';
import eas from '../eas.json';
import appConfig, { FAMILY_APP_ID, FAMILY_ROUTER_ROOT } from '../app.config';

// docs/50 §7: the family app is a variant of the same codebase (APP_VARIANT=family): its own name,
// ids, router root and channels. The staff app (no APP_VARIANT) must not change at all.

type Env = Record<string, string | undefined>;
interface Profile {
  channel?: string;
  environment?: string;
  env?: Record<string, string>;
}
const profiles: Record<string, Profile> = eas.build;

const putEnv = (key: string, value: string | undefined): boolean =>
  value === undefined
    ? Reflect.deleteProperty(process.env, key)
    : Reflect.set(process.env, key, value);
const applyEnv = (env: Env) => Object.entries(env).forEach(([key, value]) => putEnv(key, value));

const configFor = (env: Env): ExpoConfig => {
  const saved: Env = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  applyEnv(env);
  try {
    const config = JSON.parse(JSON.stringify(app.expo)) as ExpoConfig;
    return appConfig({ projectRoot: '.', staticConfigPath: null, packageJsonPath: null, config });
  } finally {
    applyEnv(saved);
  }
};

const family = (env: Env = {}) =>
  configFor({ APP_VARIANT: 'family', FAMILY_GOOGLE_SERVICES_JSON: undefined, ...env });
const routerOf = (config: ExpoConfig) =>
  config.plugins?.find((p) => (Array.isArray(p) ? p[0] : p) === 'expo-router');

test('APP_VARIANT=family: the family package, bundle id, name and own router root', () => {
  const config = family();
  expect(config.android?.package).toBe('com.ayatalbayan.family');
  expect(config.ios?.bundleIdentifier).toBe(FAMILY_APP_ID);
  expect(config.name).toBe('آيات البيان');
  expect(routerOf(config)).toEqual(['expo-router', { root: FAMILY_ROUTER_ROOT }]);
  expect(FAMILY_ROUTER_ROOT).toBe('./app-family');
  expect(config.extra?.appVariant).toBe('family');
  expect(config.scheme).not.toBe(app.expo.scheme);
});

test('the family app has no share target and keeps the shared EAS project', () => {
  const sharing = family().plugins?.find((p) => Array.isArray(p) && p[0] === 'expo-sharing');
  expect(sharing).toEqual(['expo-sharing', { android: { enabled: false } }]);
  expect(family().extra?.eas).toEqual(app.expo.extra.eas);
});

test('Firebase: FAMILY_GOOGLE_SERVICES_JSON when set, else no file (never the staff one)', () => {
  expect('googleServicesFile' in (family().android ?? {})).toBe(false);
  const withFile = family({ FAMILY_GOOGLE_SERVICES_JSON: '/tmp/family-gs.json' });
  expect(withFile.android?.googleServicesFile).toBe('/tmp/family-gs.json');
  const staffFile = family({ GOOGLE_SERVICES_JSON: '/tmp/staff-gs.json' });
  expect('googleServicesFile' in (staffFile.android ?? {})).toBe(false);
});

test('the staff config (no APP_VARIANT) is exactly app.json plus the Firebase file', () => {
  const env = { APP_VARIANT: undefined, GOOGLE_SERVICES_JSON: undefined };
  const expected = {
    ...app.expo,
    android: { ...app.expo.android, googleServicesFile: './google-services.json' },
  };
  expect(JSON.stringify(configFor(env))).toBe(JSON.stringify(expected));
  expect(routerOf(configFor(env))).toBe('expo-router');
});

test('eas.json: family APK on family-preview, family-production on its own channel', () => {
  expect(profiles['family-preview']).toMatchObject({
    channel: 'family-preview',
    environment: 'preview',
    android: { buildType: 'apk' },
    env: { APP_VARIANT: 'family' },
  });
  expect(profiles['family-production']).toMatchObject({
    channel: 'family-production',
    environment: 'production',
    env: { APP_VARIANT: 'family' },
  });
  const staff = ['development', 'preview', 'stripe-test', 'production'];
  staff.forEach((name) => expect(profiles[name]?.env?.APP_VARIANT).not.toBe('family'));
});
