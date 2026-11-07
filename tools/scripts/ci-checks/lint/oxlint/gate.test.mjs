import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { BASELINE, oxlintGate } from './gate.mjs';

/** A repo with one package (e2e) and a report of two findings in it, one outside any package. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'oxlint-gate-'));
  mkdirSync(join(root, 'e2e'));
  writeFileSync(join(root, 'e2e/lint.blocks.mjs'), 'export default { blocks: [] };');
  const at = (filename) => ({ filename, code: 'eslint(max-depth)' });
  const diagnostics = [at('e2e/a.ts'), at('e2e/a.ts')];
  writeFileSync(join(root, 'report.json'), JSON.stringify({ diagnostics }));
  return { root, report: join(root, 'report.json'), baseline: join(root, 'e2e', BASELINE) };
}
const write = (path, value) => writeFileSync(path, JSON.stringify(value));
const read = (path) => readFileSync(path, 'utf8');

test('no baseline: every finding is a new violation; suppress-all writes the report as one', () => {
  const { root, report, baseline } = fixture();
  assert.deepEqual(oxlintGate({ root, report }), [
    'new violation: e2e/a.ts max-depth 0 -> 2 (fix it)',
  ]);
  assert.deepEqual(oxlintGate({ root, report, mode: 'suppress-all' }), []);
  assert.match(read(baseline), /"max-depth": \{\s+"count": 2/);
});

test('a lower count fails until pruned; prune never raises a count', () => {
  const { root, report, baseline } = fixture();
  write(baseline, { 'a.ts': { 'max-depth': { count: 3 } }, 'b.ts': { complexity: { count: 1 } } });
  assert.deepEqual(oxlintGate({ root, report }), [
    'fixed: e2e/a.ts max-depth 3 -> 2 (pnpm lint:oxfull -- --prune, commit oxlint-suppressions.json)',
    'fixed: e2e/b.ts complexity 1 -> 0 (pnpm lint:oxfull -- --prune, commit oxlint-suppressions.json)',
  ]);
  assert.deepEqual(oxlintGate({ root, report, mode: 'prune' }), []);
  write(baseline, { 'a.ts': { 'max-depth': { count: 1 } } });
  assert.deepEqual(oxlintGate({ root, report, mode: 'prune' }), [
    'new violation: e2e/a.ts max-depth 1 -> 2 (fix it)',
  ]);
});

test('a finding outside every package fails', () => {
  const { root, report } = fixture();
  writeFileSync(report, JSON.stringify({ diagnostics: [{ filename: 'x.js', code: 'eslint(a)' }] }));
  assert.deepEqual(oxlintGate({ root, report }), ['outside any package: x.js']);
});
