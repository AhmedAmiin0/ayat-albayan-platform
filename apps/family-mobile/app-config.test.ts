import type { ExpoConfig } from 'expo/config';
import app from './app.json';
import config from './app.config';

/**
 * Lane L06 (owner 2026-11-22): the Google Play build needs push, so an EAS production build
 * without the production environment's GOOGLE_SERVICES_JSON fails instead of shipping no FCM.
 */
const saved = { ...process.env };
const unset = {
  EAS_BUILD: undefined,
  EAS_BUILD_PROFILE: undefined,
  GOOGLE_SERVICES_JSON: undefined,
};

const resolve = (env: Partial<Record<keyof typeof unset, string>>): ExpoConfig => {
  process.env = { ...saved, ...unset, ...env };
  return config({ config: app.expo as ExpoConfig, staticConfig: {} } as never);
};

afterEach(() => {
  process.env = { ...saved };
});

describe('the family app config and its Firebase file', () => {
  it('fails the EAS production build when the environment has no GOOGLE_SERVICES_JSON', () => {
    expect(() => resolve({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production' })).toThrow(
      /GOOGLE_SERVICES_JSON/,
    );
  });

  it('builds production with the file the EAS environment gives', () => {
    const env = { EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production' };
    const got = resolve({ ...env, GOOGLE_SERVICES_JSON: '/tmp/google-services.json' });
    expect(got.android?.googleServicesFile).toBe('/tmp/google-services.json');
  });

  it('keeps the preview build soft: no file, no googleServicesFile, no failure', () => {
    const got = resolve({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'preview' });
    expect(got.android?.googleServicesFile).toBeUndefined();
  });

  it('never fails off the build machine (an OTA, lint, the runner reading the config)', () => {
    expect(resolve({ EAS_BUILD_PROFILE: 'production' }).android?.googleServicesFile).toBeUndefined();
    expect(() => resolve({})).not.toThrow();
  });
});

describe('the store binary', () => {
  it('takes OTAs by native fingerprint, not by app version', () => {
    expect(app.expo.runtimeVersion).toEqual({ policy: 'fingerprint' });
  });

  it('keeps its data out of Android cloud backup', () => {
    expect(app.expo.android.allowBackup).toBe(false);
    expect(resolve({}).android?.allowBackup).toBe(false);
  });

  it('runs in portrait without requiring a portrait screen (Play device reach)', () => {
    expect(app.expo.orientation).toBe('portrait');
    expect(resolve({}).plugins).toContain('./plugins/portrait-optional/app.plugin.ts');
  });
});
