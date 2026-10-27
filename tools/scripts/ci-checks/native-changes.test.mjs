import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeChanges } from './native-changes.mjs';

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
  const found = nativeChanges(snap(base), snap(base), ['apps/mobile/assets/icon.png', 'apps/mobile/eas.json']);
  assert.deepEqual(found, ['apps/mobile/assets/icon.png changed', 'apps/mobile/eas.json changed']);
});

test('images in an assets sub-folder are imported from JS and ship by OTA', () => {
  const files = ['apps/mobile/assets/tabs/inbox.png', 'apps/mobile/assets/brand/mark.png', 'apps/mobile/assets/splash-icon.png'];
  assert.deepEqual(nativeChanges(snap(base), snap(base), files), ['apps/mobile/assets/splash-icon.png changed']);
});

test('pure-JS packages (google fonts, tanstack, supabase-js, workspace) are not native', () => {
  const before = snap(base, { '@expo-google-fonts/amiri': '^0.4.1', '@tanstack/react-query': '5.1', '@ab/shared': 'workspace:*' });
  const after = snap(base, { '@expo-google-fonts/noto-sans-arabic': '^0.4.3', '@tanstack/react-query': '5.2', '@supabase/supabase-js': '2' });
  assert.deepEqual(nativeChanges(before, after), []);
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { 'expo-camera': '1' })), ['dependency expo-camera: (none) -> 1']);
});

test('@shopify/flash-list v2 is JS-only; other @shopify packages still need an APK', () => {
  assert.deepEqual(nativeChanges(snap(base, {}), snap(base, { '@shopify/flash-list': '2.0.2' })), []);
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
