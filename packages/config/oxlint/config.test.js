// The composed Oxlint config keeps eslint.js's block order per package (docs/31b §1).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compose, lintDirs, packageOverrides, repoConfig } from './config.js';

const oxlintrc = { categories: { correctness: 'off' }, rules: { eqeqeq: 'error' }, overrides: [] };
const level = (override, rule) => override.rules[rule];

test('packageOverrides: base rules, .ts complexity, JS-only rules, tests, then the package', () => {
  const blocks = [{ rules: { 'no-console': 'off' } }];
  const { overrides } = packageOverrides({ dir: 'e2e', react: false, blocks });
  assert.deepEqual(overrides[0].files, ['e2e/**/*']);
  assert.equal(level(overrides[0], 'stylistic/max-len')[1].code, 100);
  assert.equal(level(overrides[0], 'ab/no-hand-paging'), 'error');
  assert.deepEqual(level(overrides[1], 'complexity'), ['error', { max: 6, variant: 'classic' }]);
  assert.deepEqual(overrides[2].files, ['e2e/**/*.{js,mjs,cjs,jsx}']);
  assert.equal(level(overrides[3], 'typescript/no-unsafe-call'), 'off');
  assert.equal(level(overrides.at(-2), 'no-console'), 'off');
  // Last: plain JS files lose every type-aware rule (disableTypeChecked).
  assert.deepEqual(overrides.at(-1).files, ['e2e/**/*.{js,mjs,cjs}']);
  assert.equal(level(overrides.at(-1), 'typescript/no-floating-promises'), 'off');
});

test('packageOverrides: the React flavour adds the hooks rules and browser globals', () => {
  const { overrides } = packageOverrides({ dir: 'apps/staff-web', react: true, blocks: [] });
  const react = overrides.find((o) => o.env?.browser);
  assert.equal(level(react, 'react/rules-of-hooks'), 'error');
  assert.equal(level(react, 'react-hooks-js/config'), 'error');
  const misused = ['error', { checksVoidReturn: { attributes: false } }];
  assert.deepEqual(level(react, 'typescript/no-misused-promises'), misused);
});

test('compose: the core rules first, type-aware, every package scoped, plugins registered', () => {
  const packages = [
    { dir: 'packages/db', react: false, blocks: [{ ignores: ['src/types.ts'] }] },
    { dir: 'apps/staff-web', react: true, blocks: [] },
  ];
  const config = compose({ oxlintrc, packages });
  assert.equal(config.options.typeAware, true);
  assert.deepEqual(config.rules, oxlintrc.rules);
  assert.ok(config.ignorePatterns.includes('packages/db/src/types.ts'));
  assert.deepEqual(
    config.jsPlugins.map((p) => p.name),
    ['ab', 'stylistic', 'react-hooks-js'],
  );
  const dirs = new Set(config.overrides.map((o) => o.files[0].split('/').slice(0, 2).join('/')));
  assert.deepEqual([...dirs], ['packages/db', 'apps/staff-web']);
});

/** A repo with lint.blocks.mjs in e2e and packages/db, and one in a folder lint skips. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'repo-config-'));
  const blocks = {
    e2e: '{ react: false, blocks: [{ rules: { "no-console": "off" } }] }',
    'packages/db': '{ react: false, blocks: [{ ignores: ["src/types.ts"] }] }',
    'scratch/x': '{ react: false, blocks: [] }',
  };
  for (const [dir, body] of Object.entries(blocks)) {
    mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, dir, 'lint.blocks.mjs'), `export default ${body};`);
  }
  return root;
}

test('lintDirs: the sorted workspace folders that hold a lint.blocks.mjs', () => {
  assert.deepEqual(lintDirs(repo()), ['e2e', 'packages/db']);
});

test('repoConfig: the core rules and every lint.blocks.mjs, as compose() builds them', async () => {
  const root = repo();
  const core = JSON.parse(readFileSync(new URL('./core-rules.json', import.meta.url), 'utf8'));
  const packages = [
    { dir: 'e2e', react: false, blocks: [{ rules: { 'no-console': 'off' } }] },
    { dir: 'packages/db', react: false, blocks: [{ ignores: ['src/types.ts'] }] },
  ];
  assert.deepEqual(await repoConfig(root), compose({ oxlintrc: core, packages }));
});
