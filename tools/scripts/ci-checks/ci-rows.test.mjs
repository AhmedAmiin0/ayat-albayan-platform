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

test('ci: one lint row runs pnpm lint (oxlint only) and a red lint prints the baselines to prune', () => {
  assert.deepEqual(rows.filter((r) => r.task === 'lint'), [{ name: 'lint', task: 'lint' }]);
  assert.equal(ci.jobs.verify.steps.find((x) => x.id === 'turbo').if, "matrix.task != 'lint'");
  const lint = ci.jobs.verify.steps.find((x) => x.id === 'lint');
  assert.equal(lint.if, "matrix.task == 'lint'");
  assert.match(lint.run, /pnpm lint \|\| status=\$\?/);
  const prune = step('Oxlint baselines to prune (commit this diff)');
  assert.equal(prune.if, "failure() && steps.lint.outcome == 'failure'");
  assert.match(prune.run, /oxlint\/run\.mjs --prune .*\|\| true\n.*git --no-pager diff -- '\*oxlint-suppressions\.json'/);
  assert.doesNotMatch(read('.github/workflows/ci.yml'), /eslint|lint:parity|lint:ox\b/i);
});

test('pnpm store: every job restores through the local action; only develop baselines saves', () => {
  const action = parse(read('.github/actions/pnpm-store/action.yml'));
  const restore = action.runs.steps.find((s) => s.id === 'restore');
  assert.equal(restore.uses, 'actions/cache/restore@v4');
  assert.match(restore.with.key, /^pnpm-store-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('pnpm-lock\.yaml'\) \}\}$/);
  for (const file of ['ci', 'deploy-staging', 'mobile', 'db-migrate', 'staging-test-account']) {
    const text = read(`.github/workflows/${file}.yml`);
    assert.doesNotMatch(text, /cache: pnpm/, file);
    assert.match(text, /uses: \.\/\.github\/actions\/pnpm-store/, file);
  }
  const saves = Object.entries(ci.jobs).filter(([, j]) =>
    (j.steps ?? []).some((s) => s.uses === 'actions/cache/save@v4' && /store/.test(s.with.key)),
  );
  assert.deepEqual(saves.map(([name]) => name), ['baselines']);
  const save = ci.jobs.baselines.steps.find((s) => s.uses === 'actions/cache/save@v4');
  assert.equal(save.if, "steps.store.outputs.hit != 'true'");
});

test('deploy-staging: «web» builds the app beside plan/migrate; deploy needs it and builds nothing', () => {
  const deploy = parse(read('.github/workflows/deploy-staging.yml')).jobs;
  assert.deepEqual([deploy.web.needs, deploy.web.environment], ['preflight', 'develop']);
  const build = deploy.web.steps.find((s) => s.name === 'Build the web app');
  assert.match(build.run, /pnpm --filter staff-web build$/m);
  assert.deepEqual(deploy.deploy.needs, ['preflight', 'plan', 'migrate', 'web']);
  assert.match(deploy.deploy.if, /needs\.web\.result == 'success' \|\| \(inputs\.env_only && needs\.web\.result == 'skipped'\)/);
  const get = deploy.deploy.steps.find((s) => s.uses === 'actions/download-artifact@v4');
  assert.deepEqual(get.with, { name: 'staff-web-dist', path: 'apps/staff-web/dist' });
  assert.doesNotMatch(JSON.stringify(deploy.deploy.steps), /pnpm/);
});
