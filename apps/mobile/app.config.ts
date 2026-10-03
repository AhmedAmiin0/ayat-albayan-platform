import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json stays the source of truth; this only adds the Firebase config the Android build needs
 * for push (FCM). The file is not in git: EAS passes it as the GOOGLE_SERVICES_JSON file secret
 * (environments preview/production). Locally, a google-services.json next to this file works too.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
