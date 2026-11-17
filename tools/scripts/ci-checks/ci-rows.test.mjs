// ci.yml verify rows (2026-11-17, ci-faster-2): staff-mobile jest in two shards with a kept
// transform cache; every test still runs exactly once (jest --shard splits by file path).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const rows = ci.jobs.verify.strategy.matrix.include;
const step = (name) => ci.jobs.verify.steps.find((s) => s.name === name);

test('staff-mobile runs in exactly two jest shards, each with its own transform cache', () => {
  const mobile = rows.filter((r) => r.filter === '--filter=staff-mobile' && r.task === 'test');
  assert.deepEqual(
    mobile.map((r) => [r.name, r.args, r.jcache]),
    [
      ['test mobile 1/2', '-- --shard=1/2', 'mobile-1-2'],
      ['test mobile 2/2', '-- --shard=2/2', 'mobile-2-2'],
    ],
  );
});

test('the jest cache is wired like vitest: keyed on lockfile + configs, PRs save only when cold', () => {
  const key = step('Transform cache key');
  assert.equal(key.if, 'matrix.vcache || matrix.jcache');
  assert.match(key.env.CONF, /jest\.config\.cjs/);
  assert.match(key.env.CONF, /babel\.config\.cjs/);
  assert.match(key.run, /dir=node_modules\/\.\$KIND-cache/);
  const turbo = ci.jobs.verify.steps.find((s) => s.id === 'turbo');
  assert.match(turbo.env.JEST_CACHE_DIR, /matrix\.jcache && format\('\{0\}\/node_modules\/\.jest-cache'/);
  assert.match(step('Save the transform cache').if, /cache-matched-key == ''/);
  assert.match(read('packages/mobile-kit/jest.base.cjs'), /cacheDirectory: process\.env\.JEST_CACHE_DIR/);
  const tasks = JSON.parse(read('turbo.json')).tasks;
  assert.deepEqual(tasks.test.passThroughEnv, ['JEST_CACHE_DIR'], 'not in the hash: same results');
});
