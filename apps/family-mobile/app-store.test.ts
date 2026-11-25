import type { ExpoConfig } from 'expo/config';
import app from './app.json';
import pkg from './package.json';
import config from './app.config';

/**
 * The Google Play release: guardians and students of every age, so the
 * Families policy applies: no advertising ID, no ads or analytics SDK, no broad photo access.
 */
const blocked = app.expo.android.blockedPermissions;
const resolved = (): ExpoConfig =>
  config({ config: app.expo as ExpoConfig, staticConfig: {} } as never);

describe('the store build of the family app', () => {
  it('is version 1.0.0 (its runtime is the native fingerprint: app-config.test.ts)', () => {
    expect(app.expo.version).toBe('1.0.0');
  });

  it('blocks the advertising ID', () => {
    expect(blocked).toContain('com.google.android.gms.permission.AD_ID');
  });

  it('blocks READ_MEDIA_IMAGES: the photo picker needs none and no screenshot listener runs', () => {
    expect(blocked).toContain('android.permission.READ_MEDIA_IMAGES');
  });

  it('keeps the earlier blocks (overlay window, foreground service)', () => {
    expect(blocked).toEqual(
      expect.arrayContaining([
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.FOREGROUND_SERVICE',
      ]),
    );
  });

  it('app.config.ts keeps the blocks whatever the build env', () => {
    expect(resolved().android?.blockedPermissions).toEqual(blocked);
  });

  it('depends on no ads, analytics or crash-reporting SDK', () => {
    const banned = /ads|analytics|admob|sentry|crashlytics|amplitude|segment|mixpanel|posthog/i;
    expect(Object.keys(pkg.dependencies).filter((d) => banned.test(d))).toEqual([]);
  });
});
