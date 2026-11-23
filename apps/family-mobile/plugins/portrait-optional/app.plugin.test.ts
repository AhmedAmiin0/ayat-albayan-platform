import type { AndroidConfig } from 'expo/config-plugins';

import { portraitOptional } from './app.plugin';

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Feature = NonNullable<Manifest['manifest']['uses-feature']>[number];

const PORTRAIT = 'android.hardware.screen.portrait';

const manifest = (features?: Feature[]): Manifest => ({
  manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
    'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
    ...(features ? { 'uses-feature': features } : {}),
    queries: [],
    application: [{ $: { 'android:name': '.MainApplication' } }],
  },
});

const featuresOf = (m: Manifest): Feature[] => m.manifest['uses-feature'] ?? [];

const portraitOf = (m: Manifest): Feature[] =>
  featuresOf(m).filter((f) => f.$['android:name'] === PORTRAIT);

const optional: Feature = { $: { 'android:name': PORTRAIT, 'android:required': 'false' } };

test('declares the portrait screen feature as optional on the manifest root', () => {
  expect(portraitOf(portraitOptional(manifest()))).toEqual([optional]);
});

test('a second run adds nothing (prebuild is idempotent)', () => {
  const once = portraitOptional(manifest());
  expect(portraitOptional(once)).toEqual(once);
  expect(portraitOf(portraitOptional(once))).toHaveLength(1);
});

test('flips a required portrait declaration to optional', () => {
  const required: Feature = { $: { 'android:name': PORTRAIT, 'android:required': 'true' } };
  expect(portraitOf(portraitOptional(manifest([required])))).toEqual([optional]);
});

test('collapses duplicate portrait declarations into one optional entry', () => {
  const dup: Feature = { $: { 'android:name': PORTRAIT, 'android:required': 'true' } };
  expect(portraitOf(portraitOptional(manifest([dup, dup])))).toEqual([optional]);
});

test('keeps other feature declarations and the rest of the manifest as they were', () => {
  const camera: Feature = {
    $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' },
  };
  const before = manifest([camera]);
  const out = portraitOptional(before);
  expect(featuresOf(out)).toEqual([camera, optional]);
  expect({ ...out.manifest, 'uses-feature': undefined }).toEqual({
    ...manifest().manifest,
    'uses-feature': undefined,
  });
  expect(before).toEqual(manifest([camera]));
});
