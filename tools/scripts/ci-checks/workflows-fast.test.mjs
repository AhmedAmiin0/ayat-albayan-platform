// Guards for the faster pipelines (2026-10-23): every shortcut must fail safe (docs/09 «GitHub Actions»).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const load = (f) =>
  parse(
    readFileSync(
      fileURLToPath(new URL(`../../../.github/workflows/${f}`, import.meta.url)),
      'utf8',
    ),
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

test('ci: check covers changes, every verify job, the guards and the refactor job; docs-only passes only when both were skipped', () => {
  assert.deepEqual(ci.jobs.check.needs, ['changes', 'verify', 'guards', 'refactor']);
  const run = ci.jobs.check.steps.map((s) => s.run).join('\n');
  assert.match(run, /test "\$CHANGES" = success/);
  assert.match(
    run,
    /\[ "\$CODE" = false \] && \[ "\$VERIFY" = skipped \] && \[ "\$GUARDS" = skipped \]/,
  );
  assert.match(run, /test "\$GUARDS" = success/);
  assert.match(
    run,
    /test "\$REFACTOR" = success \|\| \{ \[ "\$GITHUB_EVENT_NAME" != pull_request \]/,
  );
});

test('ci: Wave F guards fail the build (folder cap strict, jscpd, knip and lint gates)', () => {
  assert.ok(
    ci.jobs.refactor.steps.some(
      (s) => s.run === 'node tools/scripts/ci-checks/folder-cap.mjs --strict',
    ),
  );
  const runs = ci.jobs.guards.steps.map((s) => s.run);
  assert.ok(runs.includes('pnpm guard:dup') && runs.includes('pnpm guard:knip') && runs.includes('pnpm guard:lint'));
  assert.equal(ci.jobs.guards.if, "needs.changes.outputs.code == 'true'");
});

test('ci: e2e keeps the RUN_E2E switch and one database per shard', () => {
  assert.match(ci.jobs.e2e.if, /vars\.RUN_E2E != 'false'/);
  // The matrix comes from «changes»; its fallback (pushes, any failure) is the full one (e2e-areas/workflow.test.mjs).
  const fallback = JSON.parse(ci.jobs.e2e.strategy.matrix.match(/\|\| '(\{.*\})'\) \}\}$/)[1]);
  assert.deepEqual(
    fallback.include.map((m) => m.shard),
    ['1', '2', '3', '4', 'single'],
  );
  assert.equal(ci.jobs.e2e.env.SHARDS, '${{ matrix.total }}');
  assert.ok(!('pull_request_target' in ci.on));
});

test('mobile.yml profile: preview by default (every automatic run), stripe-test only by hand, on its own channel', () => {
  const mobile = load('mobile.yml');
  const input = mobile.on.workflow_dispatch.inputs.profile;
  assert.deepEqual([input.type, input.options, input.default], ['choice', ['preview', 'stripe-test'], 'preview']);
  const dispatch = deploy.jobs.ota.steps.map((s) => s.run ?? '').join('\n');
  assert.doesNotMatch(dispatch, /profile|stripe/i, 'deploy-staging must leave the profile at preview');
  const step = (job, name) => mobile.jobs[job].steps.find((s) => s.name?.startsWith(name));
  assert.match(step('build', 'EAS build').run, /--profile "\$PROFILE"/);
  const guard = step('ota', 'Native-change guard');
  assert.match(guard.run, /--build-profile "\$PROFILE" --status finished/);
  assert.match(guard.run, /native-changes\.mjs "\$last" "\$PROFILE"/);
  for (const s of [step('build', 'EAS build'), guard, step('ota', 'EAS update')]) {
    assert.equal(s.env.PROFILE, "${{ inputs.profile || 'preview' }}");
  }
  const update = step('ota', 'EAS update').run;
  const [side, normal] = update.split('exit 0');
  assert.match(side, /if \[ "\$PROFILE" = stripe-test \]/);
  assert.match(side, /EXPO_PUBLIC_FEATURE_STRIPE=1 APP_VARIANT=stripetest/);
  assert.match(side, /--channel stripe-test --environment preview/);
  assert.doesNotMatch(normal, /STRIPE|APP_VARIANT|channel/);
  assert.match(normal, /update --branch "\$EAS_BRANCH" --environment "\$EAS_BRANCH"/);
  assert.match(mobile['run-name'], /inputs\.profile == 'stripe-test' && 'stripe-test' \|\| inputs\.branch/);
});

test('deploy-staging merges LOGIN_CODE_PEPPER from a secret into the server .env (docs/30 §8)', () => {
  const step = deploy.jobs.deploy.steps.find((s) => s.name?.startsWith('Merge the server .env'));
  assert.equal(step.env.LOGIN_CODE_PEPPER, '${{ secrets.LOGIN_CODE_PEPPER }}');
  const keys = /keys="([^"]+)"/.exec(step.run)?.[1].split(/\s+/) ?? [];
  assert.ok(keys.includes('LOGIN_CODE_PEPPER'), 'the env-merge keys list');
  // Every key the step reads is merged, and every merged key comes from the step's env.
  assert.deepEqual([...keys].sort(), Object.keys(step.env).sort());
});
