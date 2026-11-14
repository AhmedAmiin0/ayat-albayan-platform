import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

/** The eas.json `stripe-test` profile's APP_VARIANT: a separate app installable beside the normal one. */
const STRIPE_TEST = 'stripetest';

type Plugins = NonNullable<ExpoConfig['plugins']>;

/** The test app is no share target (docs/38): one «آيات» in the share sheet, the normal app. */
const noShareTarget = (plugins: Plugins = []): Plugins =>
  plugins.map((p) => (Array.isArray(p) && p[0] === 'expo-sharing' ? ['expo-sharing', { android: { enabled: false } }] : p));

/**
 * The Stripe test variant (owner 2026-10-28, docs/30): its own package / bundle id and name, and NO
 * android.googleServicesFile: Firebase knows only the normal package, so the test app has no FCM push
 * (registerPush fails soft: no token, no crash). Everything else is the normal app's config.
 */
function stripeTestVariant(config: ExpoConfig): ExpoConfig {
  const suffix = (id: string | undefined) => (id ? `${id}.${STRIPE_TEST}` : id);
  const android = { ...config.android, package: suffix(config.android?.package) };
  delete android.googleServicesFile;
  return {
    ...config,
    name: 'Ayat – Stripe test',
    ...(config.ios ? { ios: { ...config.ios, bundleIdentifier: suffix(config.ios.bundleIdentifier) } } : {}),
    android,
    plugins: noShareTarget(config.plugins),
  };
}

/** The build env this file reads besides GOOGLE_SERVICES_JSON (rule 12: parsed, never trusted). */
const variantEnv = z.object({
  APP_VARIANT: z.string().optional(),
  FAMILY_GOOGLE_SERVICES_JSON: z.string().min(1).optional(),
});

const readEnv = () => variantEnv.parse(process.env);

/** APP_VARIANT of the eas.json `family-*` profiles: the family app (docs/50 §7). */
const FAMILY = 'family';

/** The family app's own identity: Android package and iOS bundle id. */
export const FAMILY_APP_ID = 'com.ayatalbayan.family';

/** Its expo-router root: the family routes only (the staff routes stay in app/). */
export const FAMILY_ROUTER_ROOT = './app-family';

/** The router gets the family root; the share target is off as in the test app. */
const familyPlugins = (plugins: Plugins = []): Plugins =>
  noShareTarget(plugins).map((p) =>
    p === 'expo-router' ? ['expo-router', { root: FAMILY_ROUTER_ROOT }] : p,
  );

/**
 * The family app (owner 2026-11-14, docs/50 §7): the same codebase and EAS project, its own name,
 * ids, scheme, router root and update channels. Firebase: FAMILY_GOOGLE_SERVICES_JSON when the
 * owner has added the app there, else no file (registerPush fails soft: no token, no crash).
 * `extra.appVariant` tells the running bundle which app it is (src/core/lib/app-kind.ts).
 */
function familyVariant(config: ExpoConfig): ExpoConfig {
  const android = { ...config.android, package: FAMILY_APP_ID };
  delete android.googleServicesFile;
  const firebase = readEnv().FAMILY_GOOGLE_SERVICES_JSON;
  return {
    ...config,
    name: 'آيات البيان',
    scheme: 'ayatalbayan-family',
    ...(config.ios ? { ios: { ...config.ios, bundleIdentifier: FAMILY_APP_ID } } : {}),
    android: firebase ? { ...android, googleServicesFile: firebase } : android,
    plugins: familyPlugins(config.plugins),
    extra: { ...config.extra, appVariant: FAMILY },
  };
}

const VARIANTS: Record<string, (config: ExpoConfig) => ExpoConfig> = {
  [STRIPE_TEST]: stripeTestVariant,
  [FAMILY]: familyVariant,
};

/**
 * app.json stays the source of truth; this only adds the Firebase config the Android build needs
 * for push (FCM). The file is not in git: EAS passes it as the GOOGLE_SERVICES_JSON file secret
 * (environments preview/production). Locally, a google-services.json next to this file works too.
 * APP_VARIANT=stripetest (eas.json `stripe-test` only) renames the app, suffixes its ids and drops the
 * Firebase file (no push in the test app); APP_VARIANT=family builds the family app. With
 * APP_VARIANT unset the config is exactly as before.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  };
  const variant = VARIANTS[readEnv().APP_VARIANT ?? ''];
  return variant ? variant(base) : base;
};
