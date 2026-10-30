// The Metro bundle job (docs/32 x0, critic correction 11): jest never bundles, so this is the only
// CI step that builds the JavaScript an OTA ships, with the same Babel config (React Compiler on).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const mobile = JSON.parse(read('apps/mobile/package.json'));
const turbo = JSON.parse(read('turbo.json'));

test('ci verify bundles the mobile app with Metro for android', () => {
  const row = ci.jobs.verify.strategy.matrix.include.find((r) => r.name === 'bundle mobile');
  assert.deepEqual(row, { name: 'bundle mobile', task: 'bundle', filter: '--filter=mobile' });
  assert.match(mobile.scripts.bundle, /^expo export --platform android /);
});

test('the bundle task builds the workspace packages first and writes into ignored dist/', () => {
  assert.deepEqual(turbo.tasks.bundle.dependsOn, ['^build']);
  assert.match(mobile.scripts.bundle, /--output-dir dist\//);
  assert.match(read('.gitignore'), /^dist\/$/m);
});

test('the bundle uses the app Babel config, where app.json switches the React Compiler on', () => {
  const app = JSON.parse(read('apps/mobile/app.json'));
  assert.equal(app.expo.experiments.reactCompiler, true);
  assert.match(read('apps/mobile/babel.config.cjs'), /babel-plugin-react-compiler/);
});
