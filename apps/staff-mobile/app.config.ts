import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

/** The eas.json `stripe-test` APP_VARIANT: a separate app installable beside the normal one. */
const STRIPE_TEST = 'stripetest';
const servicesFile = z.string().default('./google-services.json');

type Plugins = NonNullable<ExpoConfig['plugins']>;

/** The test app is no share target (docs/38), so the share sheet shows only the normal app. */
const noShareTarget = (plugins: Plugins = []): Plugins =>
  plugins.map((p) =>
    Array.isArray(p) && p[0] === 'expo-sharing'
      ? ['expo-sharing', { android: { enabled: false } }]
      : p,
  );

/**
 * The Stripe test variant (docs/30): its own package / bundle id and name, and NO
 * android.googleServicesFile: Firebase knows only the normal package, so no FCM push in it
 * (registerPush fails soft: no token, no crash). Everything else is the normal app's config.
 */
function stripeTestVariant(config: ExpoConfig): ExpoConfig {
  const suffix = (id: string | undefined) => (id ? `${id}.${STRIPE_TEST}` : id);
  const android = { ...config.android, package: suffix(config.android?.package) };
  delete android.googleServicesFile;
  return {
    ...config,
    name: 'Ayat – Stripe test',
    ...(config.ios
      ? { ios: { ...config.ios, bundleIdentifier: suffix(config.ios.bundleIdentifier) } }
      : {}),
    android,
    plugins: noShareTarget(config.plugins),
  };
}

/**
 * app.json stays the source of truth; this only adds the Firebase config the Android build needs
 * for push (FCM). The file is not in git: EAS passes it as the GOOGLE_SERVICES_JSON file secret
 * (environments preview/production). Locally, a google-services.json next to this file works too.
 * APP_VARIANT=stripetest (eas.json `stripe-test`) renames the app, suffixes its ids, drops the
 * Firebase file (no push in the test app). With APP_VARIANT unset the config is exactly as before.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      googleServicesFile: servicesFile.parse(process.env.GOOGLE_SERVICES_JSON),
    },
  };
  return process.env.APP_VARIANT === STRIPE_TEST ? stripeTestVariant(base) : base;
};
