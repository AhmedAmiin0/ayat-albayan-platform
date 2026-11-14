// docs/38: what else needs an APK besides app.json, package.json dependencies, assets and eas.json.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nativeChanges } from './native-changes.mjs';

const expo = { version: '0.4.0', plugins: ['expo-router'] };
const snap = (pkg = {}) => ({ appJson: JSON.stringify({ expo }), appConfig: 'x', pkg: JSON.stringify(pkg) });

test('a local config plugin and a pnpm patch are native; their tests and snapshots are not', () => {
  const files = [
    'apps/mobile/plugins/share-intent/app.plugin.ts',
    'apps/mobile/plugins/share-intent/app.plugin.test.ts',
    'apps/mobile/plugins/share-intent/__snapshots__/app.plugin.test.ts.snap',
    'patches/expo-sharing@57.0.24.patch',
  ];
  assert.deepEqual(nativeChanges(snap(), snap(), { files }), [
    'apps/mobile/plugins/share-intent/app.plugin.ts changed',
    'patches/expo-sharing@57.0.24.patch changed',
  ]);
});

test('package.json "expo" (autolinking buildFromSource) is native', () => {
  const after = snap({ expo: { autolinking: { android: { buildFromSource: ['expo-sharing'] } } } });
  assert.deepEqual(nativeChanges(snap(), after), ['package.json: expo (autolinking)']);
  assert.deepEqual(nativeChanges(after, after), []);
});

test('APP_DIR picks the Expo app compared: the family app (docs/50 §7) has its own assets and plugins', async () => {
  const prior = process.env.APP_DIR;
  process.env.APP_DIR = 'apps/family';
  try {
    const family = await import('./native-changes.mjs?app=family');
    const files = ['apps/family/assets/icon.png', 'apps/family/plugins/x.ts', 'apps/mobile/assets/icon.png'];
    assert.deepEqual(family.nativeChanges(snap(), snap(), { files }), [
      'apps/family/assets/icon.png changed',
      'apps/family/plugins/x.ts changed',
    ]);
  } finally {
    if (prior === undefined) delete process.env.APP_DIR;
    else process.env.APP_DIR = prior;
  }
  // Unset (every staff run and deploy-staging): apps/mobile, as before.
  assert.deepEqual(nativeChanges(snap(), snap(), { files: ['apps/family/assets/icon.png'] }), []);
});

test('the old family-* profiles of apps/mobile/eas.json are side profiles: removing them is no APK', () => {
  const eas = (build) => ({ ...snap(), eas: JSON.stringify({ build }) });
  const preview = { preview: { channel: 'preview' } };
  const family = { 'family-preview': { channel: 'family-preview', env: { APP_VARIANT: 'family' } } };
  const files = { files: ['apps/mobile/eas.json'] };
  assert.deepEqual(nativeChanges(eas({ ...preview, ...family }), eas(preview), files), []);
});
