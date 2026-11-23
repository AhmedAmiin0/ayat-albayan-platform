import { type AndroidConfig, type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

// Expo config plugin (native: needs a new store build). orientation "portrait" sets the activity's
// screenOrientation=portrait, which Google Play reads as a required
// android.hardware.screen.portrait feature and hides the app from devices without one (tablets,
// desktop, XR). The app still runs in portrait; the optional feature only widens who may install.

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Feature = NonNullable<Manifest['manifest']['uses-feature']>[number];

const PORTRAIT = 'android.hardware.screen.portrait';

const OPTIONAL_PORTRAIT: Feature = { $: { 'android:name': PORTRAIT, 'android:required': 'false' } };

const isPortrait = (feature: Feature): boolean => feature.$['android:name'] === PORTRAIT;

/** The manifest with exactly one <uses-feature> for the portrait screen, marked not required. */
export function portraitOptional(manifest: Manifest): Manifest {
  const others = (manifest.manifest['uses-feature'] ?? []).filter((f) => !isPortrait(f));
  const features = [...others, OPTIONAL_PORTRAIT];
  return { ...manifest, manifest: { ...manifest.manifest, 'uses-feature': features } };
}

/** The plugin. One self-contained file: Expo compiles a .ts plugin, not the modules it imports. */
const withPortraitOptional: ConfigPlugin = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = portraitOptional(cfg.modResults);
    return cfg;
  });

export default withPortraitOptional;
