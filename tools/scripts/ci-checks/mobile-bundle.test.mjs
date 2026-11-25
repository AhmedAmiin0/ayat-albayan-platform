// The Metro bundle job (docs/32 x0, critic correction 11): jest never bundles, so this is the only
// CI step that builds the JavaScript an OTA ships, with the same Babel config (React Compiler on).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const mobile = JSON.parse(read('apps/staff-mobile/package.json'));
const turbo = JSON.parse(read('turbo.json'));

test('ci verify bundles the mobile app with Metro for android', () => {
  const row = ci.jobs.verify.strategy.matrix.include.find((r) => r.name === 'typecheck + bundles');
  assert.deepEqual(row, { name: 'typecheck + bundles', task: 'typecheck bundle' });
  assert.match(mobile.scripts.bundle, /^expo export --platform android /);
});

test('the bundle task builds the workspace packages first and writes into ignored dist/', () => {
  assert.deepEqual(turbo.tasks.bundle.dependsOn, ['^build']);
  assert.match(mobile.scripts.bundle, /--output-dir dist\//);
  assert.match(read('.gitignore'), /^dist\/$/m);
});

test('each app bundles with the shared Babel config, where app.json switches the Compiler on', () => {
  for (const dir of ['apps/staff-mobile', 'apps/family-mobile']) {
    const app = JSON.parse(read(`${dir}/app.json`));
    assert.equal(app.expo.experiments.reactCompiler, true);
    assert.match(read(`${dir}/babel.config.cjs`), /@ab\/config\/babel/);
  }
  assert.match(read('packages/config/expo/babel.cjs'), /babel-plugin-react-compiler/);
});
