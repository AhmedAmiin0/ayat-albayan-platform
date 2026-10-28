import type { ConfigContext, ExpoConfig } from 'expo/config';

/** The eas.json `stripe-test` profile's APP_VARIANT: a separate app installable beside the normal one. */
const STRIPE_TEST = 'stripetest';

/** The Stripe test variant (owner 2026-10-28, docs/30): its own package / bundle id and name; nothing else. */
function stripeTestVariant(config: ExpoConfig): ExpoConfig {
  const suffix = (id: string | undefined) => (id ? `${id}.${STRIPE_TEST}` : id);
  return {
    ...config,
    name: 'Ayat – Stripe test',
    ...(config.ios ? { ios: { ...config.ios, bundleIdentifier: suffix(config.ios.bundleIdentifier) } } : {}),
    android: { ...config.android, package: suffix(config.android?.package) },
  };
}

/**
 * app.json stays the source of truth; this only adds the Firebase config the Android build needs
 * for push (FCM). The file is not in git: EAS passes it as the GOOGLE_SERVICES_JSON file secret
 * (environments preview/production). Locally, a google-services.json next to this file works too.
 * APP_VARIANT=stripetest (eas.json `stripe-test` only) renames the app and suffixes its ids.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  };
  return process.env.APP_VARIANT === STRIPE_TEST ? stripeTestVariant(base) : base;
};
