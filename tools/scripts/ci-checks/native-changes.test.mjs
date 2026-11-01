import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configOut, nativeChanges, variantOf } from './native-changes.mjs';

const app = (expo) => JSON.stringify({ expo });
const snap = (expo, deps = {}, appConfig = 'x') => ({ appJson: app(expo), appConfig, pkg: JSON.stringify({ dependencies: deps }) });
const base = { version: '0.1.0', plugins: ['expo-router'], android: { package: 'a.b' }, name: 'n' };

test('identical snapshots have no native change', () => {
  assert.deepEqual(nativeChanges(snap(base, { expo: '~57.0.0' }), snap(base, { expo: '~57.0.0' })), []);
});

test('a non-native field (description, extra) is ignored', () => {
  assert.deepEqual(nativeChanges(snap(base), snap({ ...base, description: 'x', extra: { a: 1 } })), []);
});

test('app name, icon, splash, orientation, theme, notification, status bar and updates are native', () => {
  const after = snap({ ...base, name: 'm', icon: './a.png', splash: { image: 'b' }, orientation: 'portrait',
    userInterfaceStyle: 'dark', notification: { color: '#fff' }, androidStatusBar: { barStyle: 'x' }, updates: { url: 'u' } });
  assert.deepEqual(nativeChanges(snap(base), after).map((f) => f.replace('app.json: expo.', '')),
    ['name', 'icon', 'splash', 'orientation', 'userInterfaceStyle', 'notification', 'androidStatusBar', 'updates']);
});

test('changed asset or eas.json files are reported', () => {
  const found = nativeChanges(snap(base), snap(base), { files: ['apps/mobile/assets/icon.png', 'apps/mobile/eas.json'] });
  assert.deepEqual(found, ['apps/mobile/assets/icon.png changed', 'apps/mobile/eas.json changed']);
});

test('images in an assets sub-folder are imported from JS and ship by OTA', () => {
  const files = ['apps/mobile/assets/tabs/inbox.png', 'apps/mobile/assets/brand/mark.png', 'apps/mobile/assets/splash-icon.png'];
  assert.deepEqual(nativeChanges(snap(base), snap(base), { files }), ['apps/mobile/assets/splash-icon.png changed']);
});

test('pure-JS packages (google fonts, tanstack, supabase-js, zod, workspace) are not native', () => {
  const before = snap(base, { '@expo-google-fonts/amiri': '^0.4.1', '@tanstack/react-query': '5.1', '@ab/shared': 'workspace:*' });
  const after = snap(base, { '@expo-google-fonts/noto-sans-arabic': '^0.4.3', '@tanstack/react-query': '5.2', '@supabase/supabase-js': '2' });
  assert.deepEqual(nativeChanges(before, after), []);
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { zod: '^4.6.5' })), []);
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { 'expo-camera': '1' })), ['dependency expo-camera: (none) -> 1']);
});

test('@shopify/flash-list v2 is JS-only; its native 1.x, a new major and other @shopify packages need an APK', () => {
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { '@shopify/flash-list': '2.0.2' })), []);
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { '@shopify/flash-list': '^2.3.2' })), []);
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { '@shopify/flash-list': '1.7.6' })), [
    'dependency @shopify/flash-list: (none) -> 1.7.6',
  ]);
  assert.deepEqual(nativeChanges(snap(base, { '@shopify/flash-list': '2.0.2' }), snap(base, { '@shopify/flash-list': '3.0.0' })), [
    'dependency @shopify/flash-list: 2.0.2 -> 3.0.0',
  ]);
  const found = nativeChanges(snap(base, {}), snap(base, { '@shopify/react-native-skia': '2' }));
  assert.deepEqual(found, ['dependency @shopify/react-native-skia: (none) -> 2']);
});

test('plugins, android fields and version are native', () => {
  const after = snap({ ...base, version: '0.2.0', plugins: ['expo-router', 'expo-camera'], android: { package: 'a.c' } });
  assert.deepEqual(nativeChanges(snap(base), after), ['app.json: expo.version', 'app.json: expo.plugins', 'app.json: expo.android']);
});

test('added, removed and bumped dependencies are reported; devDependencies are not read', () => {
  const before = snap(base, { a: '1', b: '1' });
  const after = snap(base, { a: '2', c: '1' });
  const found = nativeChanges(before, after);
  assert.equal(found.length, 3);
  assert.ok(found.includes('dependency b: 1 -> (removed)'));
  assert.ok(found.includes('dependency c: (none) -> 1'));
});

test('a changed app.config.ts counts, and a missing old file is a change from nothing', () => {
  assert.deepEqual(nativeChanges(snap(base, {}, 'a'), snap(base, {}, 'b')), ['app.config.ts changed (dynamic config)']);
  assert.ok(nativeChanges({ appJson: '', appConfig: '', pkg: '' }, snap(base)).length > 0);
});

const eas = (build) => JSON.stringify({ cli: { version: '>= 16' }, build });
const PROFILES = { preview: { channel: 'preview' }, production: { channel: 'production' } };

test('eas.json: a side profile (the Stripe test app, docs/30) is not native; a normal profile is', () => {
  const before = { ...snap(base), eas: eas(PROFILES) };
  const side = { ...snap(base), eas: eas({ ...PROFILES, 'stripe-test': { channel: 'stripe-test', env: { APP_VARIANT: 'stripetest' } } }) };
  assert.deepEqual(nativeChanges(before, side, { files: ['apps/mobile/eas.json'] }), []);
  const preview = { ...snap(base), eas: eas({ ...PROFILES, preview: { channel: 'preview', env: { X: '1' } } }) };
  assert.deepEqual(nativeChanges(before, preview, { files: ['apps/mobile/eas.json'] }), ['apps/mobile/eas.json changed']);
});

test('eas.json: an EXPO_PUBLIC_* env value is bundled JS, not native (docs/30: the Stripe flag on preview)', () => {
  const before = { ...snap(base), eas: eas({ ...PROFILES, preview: { channel: 'preview', env: { X: '1' } } }) };
  const flagged = { ...snap(base), eas: eas({ ...PROFILES, preview: { channel: 'preview', env: { X: '1', EXPO_PUBLIC_FEATURE_STRIPE: '1' } } }) };
  assert.deepEqual(nativeChanges(before, flagged, { files: ['apps/mobile/eas.json'] }), []);
  assert.deepEqual(nativeChanges({ ...snap(base), eas: eas(PROFILES) }, flagged, { files: ['apps/mobile/eas.json'] }), ['apps/mobile/eas.json changed']);
});

const CONFIG = `import type { ConfigContext, ExpoConfig } from 'expo/config';
export default ({ config }: ConfigContext): ExpoConfig => ({ ...(config as ExpoConfig), android: { ...config.android, googleServicesFile: './g.json' } });
`;
const VARIANT = `import type { ConfigContext, ExpoConfig } from 'expo/config';
const SIDE = 'stripetest';
export default ({ config }: ConfigContext): ExpoConfig => {
  const base: ExpoConfig = { ...(config as ExpoConfig), android: { ...config.android, googleServicesFile: './g.json' } };
  return process.env.APP_VARIANT === SIDE ? { ...base, name: 'side' } : base;
};
`;

test('app.config.ts is compared as the normal app EAS builds: a side variant only is not native', async () => {
  const appJson = app(base);
  const [before, after] = [await configOut(CONFIG, appJson), await configOut(VARIANT, appJson)];
  assert.equal(typeof before, 'string');
  assert.equal(before, after);
  assert.deepEqual(nativeChanges({ ...snap(base, {}, CONFIG), configOut: before }, { ...snap(base, {}, VARIANT), configOut: after }), []);
});

test('app.config.ts: a change to the normal app counts; one that cannot be evaluated falls back to the text', async () => {
  const appJson = app(base);
  const moved = await configOut(CONFIG.replace('./g.json', './other.json'), appJson);
  const found = nativeChanges({ ...snap(base, {}, CONFIG), configOut: await configOut(CONFIG, appJson) }, { ...snap(base, {}, 'y'), configOut: moved });
  assert.deepEqual(found, ['app.config.ts changed (dynamic config)']);
  assert.equal(await configOut('export default (', appJson), null);
  assert.deepEqual(nativeChanges(snap(base, {}, 'a'), { ...snap(base, {}, 'b'), configOut: null }), ['app.config.ts changed (dynamic config)']);
});

test('a stripe-test OTA: only its own eas.json profile counts; the normal profiles do not', () => {
  const side = (env) => ({ ...snap(base), eas: eas({ ...PROFILES, 'stripe-test': { channel: 'stripe-test', env } }) });
  const before = side({ APP_VARIANT: 'stripetest' });
  const files = { files: ['apps/mobile/eas.json'], profile: 'stripe-test' };
  const preview = { ...before, eas: eas({ ...PROFILES, preview: { channel: 'preview', env: { X: '1' } }, 'stripe-test': JSON.parse(before.eas).build['stripe-test'] }) };
  assert.deepEqual(nativeChanges(before, preview, files), []);
  assert.deepEqual(nativeChanges(before, side({ APP_VARIANT: 'stripetest', Y: '1' }), files), ['apps/mobile/eas.json changed']);
  assert.equal(variantOf(before.eas, 'stripe-test'), 'stripetest');
  assert.equal(variantOf(before.eas, 'preview'), undefined);
  assert.equal(variantOf('{', 'preview'), undefined);
});

const NO_FCM = VARIANT.replace("{ ...base, name: 'side' }", "{ ...base, name: 'side', android: { package: 'side' } }");

test('app.config.ts per app: a side-variant-only change is native for the side app, not for the normal one', async () => {
  const appJson = app(base);
  const normal = [await configOut(VARIANT, appJson), await configOut(NO_FCM, appJson)];
  assert.equal(normal[0], normal[1]);
  const side = [await configOut(VARIANT, appJson, 'stripetest'), await configOut(NO_FCM, appJson, 'stripetest')];
  assert.notEqual(side[0], side[1]);
  assert.match(side[1], /"name":"side"/);
  const snaps = [{ ...snap(base, {}, VARIANT), configOut: side[0] }, { ...snap(base, {}, NO_FCM), configOut: side[1] }];
  assert.deepEqual(nativeChanges(...snaps, { profile: 'stripe-test' }), ['app.config.ts changed (dynamic config)']);
  assert.equal(process.env.APP_VARIANT, undefined);
});
