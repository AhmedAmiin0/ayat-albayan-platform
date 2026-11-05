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
