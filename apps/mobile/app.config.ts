import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * eas.json side apps, APP_VARIANT → app name: each installs beside the normal (production) app
 * and talks to STAGING. `stripetest` = the `stripe-test` profile (owner 2026-10-28, docs/30);
 * `staging` = the `staging` profile (owner 2026-10-31, docs/09 «Staging»).
 */
const SIDE_APPS = new Map([
  ['stripetest', 'Ayat – Stripe test'],
  ['staging', 'آيات البيان (تجريبي)'],
]);

/**
 * A side app: its own package / bundle id (`<id>.<variant>`) and name, and NO
 * android.googleServicesFile: Firebase knows only the normal package, so a side app has no FCM
 * push (registerPush fails soft: no token, no crash). The rest is the normal app's config.
 */
function sideApp(config: ExpoConfig, variant: string, name: string): ExpoConfig {
  const suffix = (id: string | undefined) => (id ? `${id}.${variant}` : id);
  const android = { ...config.android, package: suffix(config.android?.package) };
  delete android.googleServicesFile;
  return {
    ...config,
    name,
    ...(config.ios ? { ios: { ...config.ios, bundleIdentifier: suffix(config.ios.bundleIdentifier) } } : {}),
    android,
  };
}

/**
 * app.json stays the source of truth; this only adds the Firebase config the Android build needs
 * for push (FCM). The file is not in git: EAS passes it as the GOOGLE_SERVICES_JSON file secret
 * (environments preview/production). Locally, a google-services.json next to this file works too.
 * APP_VARIANT (eas.json side profiles only) renames the app, suffixes its ids and drops the
 * Firebase file. With APP_VARIANT unset the config is exactly as before.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  };
  // process.env is untyped here: String() keeps `any` out of the calls below.
  const variant = String(process.env.APP_VARIANT ?? '');
  const name = SIDE_APPS.get(variant);
  return name ? sideApp(base, variant, name) : base;
};
