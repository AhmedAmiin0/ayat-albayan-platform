import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { lintReport } from './run.mjs';

const rootWith = (manifest) => {
  const root = mkdtempSync(join(tmpdir(), 'lint-report-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  return root;
};

test('lintReport: the root lint:report script, run with the root binary', () => {
  const script = 'oxlint -c oxlint.config.ts --type-aware --deny-warnings --format json';
  const root = rootWith({ scripts: { 'lint:report': script } });
  assert.deepEqual(lintReport(root), {
    bin: join(root, 'node_modules/.bin/oxlint'),
    args: ['-c', 'oxlint.config.ts', '--type-aware', '--deny-warnings', '--format', 'json'],
  });
});

test('lintReport: a root without the script fails on its manifest, not later', () => {
  assert.throws(() => lintReport(rootWith({ scripts: {} })), /lint:report/);
});

test('the repo root runs oxlint type-aware with warnings denied', () => {
  const root = new URL('../../../../..', import.meta.url).pathname;
  const { args } = lintReport(root);
  for (const flag of ['--type-aware', '--deny-warnings']) assert.ok(args.includes(flag), flag);
  assert.deepEqual(args.slice(0, 2), ['-c', 'oxlint.config.ts']);
});
