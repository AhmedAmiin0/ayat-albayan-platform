import { type AndroidConfig, type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

// Expo config plugin (native: needs a new APK); a security requirement. Android 10+
// AudioPlaybackCapture (the built-in screen recorder, any capture app) records an app's media
// audio unless the app opts out. Recorded lessons are audio: the app opts out. Android only; the
// one attribute on <application> is the only change to the manifest.

type Manifest = AndroidConfig.Manifest.AndroidManifest;

/** The manifest with android:allowAudioPlaybackCapture="false" on its <application>. */
export function blockAudioCapture(manifest: Manifest): Manifest {
  const [app, ...rest] = manifest.manifest.application ?? [];
  if (!app) throw new Error('no-audio-capture: the manifest has no <application>');
  const blocked = { ...app, $: { ...app.$, 'android:allowAudioPlaybackCapture': 'false' } };
  return { ...manifest, manifest: { ...manifest.manifest, application: [blocked, ...rest] } };
}

/** The plugin. One self-contained file: Expo compiles a .ts plugin, not the modules it imports. */
const withNoAudioCapture: ConfigPlugin = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = blockAudioCapture(cfg.modResults);
    return cfg;
  });

export default withNoAudioCapture;
