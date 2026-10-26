// Guards for the faster pipelines (2026-10-23): every shortcut must fail safe (docs/09 «GitHub Actions»).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const load = (f) =>
  parse(
    readFileSync(fileURLToPath(new URL(`../../../.github/workflows/${f}`, import.meta.url)), 'utf8'),
  );
const deploy = load('deploy-staging.yml');
const ci = load('ci.yml');

test('automatic deploys skip migrate only when plan said exactly "false"', () => {
  const cond = deploy.jobs.migrate.if;
  assert.match(cond, /needs\.plan\.outputs\.migrations != 'false'/);
  assert.match(cond, /!cancelled\(\)/, 'a failed plan must not skip migrate');
  assert.deepEqual(deploy.jobs.migrate.needs, ['preflight', 'plan']);
  assert.equal(deploy.jobs.migrate.uses, './.github/workflows/db-migrate.yml');
});

test('plan and ota bind no environment and read no secret', () => {
  for (const name of ['plan', 'ota']) {
    const job = deploy.jobs[name];
    assert.equal(job.environment, undefined, name);
    assert.doesNotMatch(JSON.stringify(job), /secrets\./, name);
  }
  assert.deepEqual(deploy.jobs.plan.permissions, { contents: 'read', actions: 'read' });
});

test('the automatic OTA only dispatches mobile.yml ota-update to preview on develop', () => {
  const job = deploy.jobs.ota;
  assert.match(job.if, /needs\.deploy\.result == 'success'/);
  assert.match(job.if, /needs\.plan\.outputs\.ota == 'true'/);
  const run = job.steps.map((s) => s.run ?? '').join('\n');
  assert.match(run, /mobile\.yml\/dispatches/);
  assert.match(run, /"ref":"develop","inputs":\{"action":"ota-update","branch":"preview"\}/);
  assert.doesNotMatch(run, /build-android-apk|production|force_ota|ios/i);
});

test('ci: check covers changes and every verify job; docs-only passes only when verify was skipped', () => {
  assert.deepEqual(ci.jobs.check.needs, ['changes', 'verify']);
  const run = ci.jobs.check.steps.map((s) => s.run).join('\n');
  assert.match(run, /test "\$CHANGES" = success/);
  assert.match(run, /\[ "\$CODE" = false \] && \[ "\$VERIFY" = skipped \]/);
});

test('ci: e2e keeps the RUN_E2E switch and one database per shard', () => {
  assert.match(ci.jobs.e2e.if, /vars\.RUN_E2E != 'false'/);
  const shards = ci.jobs.e2e.strategy.matrix.include.map((m) => m.shard);
  assert.deepEqual(shards, ['1', '2', '3', '4', 'single']);
  assert.equal(String(ci.jobs.e2e.env.SHARDS), String(shards.length - 1));
  assert.ok(!('pull_request_target' in ci.on));
});
