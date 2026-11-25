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

test('ci: check covers changes, every verify job, the guards, the refactor and secret-scan jobs; docs-only passes only when both were skipped', () => {
  assert.deepEqual(ci.jobs.check.needs, ['changes', 'verify', 'guards', 'refactor', 'image', 'secret-scan']);
  const run = ci.jobs.check.steps.map((s) => s.run).join('\n');
  assert.match(run, /test "\$CHANGES" = success/);
  assert.match(run, /\[ "\$CODE" = false \] && \[ "\$VERIFY" = skipped \] && \[ "\$GUARDS" = skipped \]; then/);
  assert.match(run, /test "\$VERIFY" = success\n\s*test "\$GUARDS" = success/);
  assert.match(
    run,
    /test "\$REFACTOR" = success \|\| \{ \[ "\$GITHUB_EVENT_NAME" != pull_request \]/,
  );
});

test('ci: Wave F guards fail the build (folder cap strict, jscpd, knip, queries, baselines and lint gates)', () => {
  assert.ok(
    ci.jobs.refactor.steps.some(
      (s) => s.run === 'node tools/scripts/ci-checks/folder-cap.mjs --strict',
    ),
  );
  const runs = ci.jobs.guards.steps.map((s) => s.run ?? '');
  assert.ok(['pnpm guard:dup', 'pnpm guard:knip', 'pnpm guard:queries', 'pnpm guard:cycles'].every((r) => runs.includes(r)));
  // On a PR the count gates also measure the merge base (GUARD_BASE): no PR edits a baseline.
  const base = ci.jobs.guards.steps.find((s) => s.if === "github.event_name == 'pull_request'" && s.name?.startsWith('Base branch'));
  assert.match(base.run, /merge-base "origin\/\$BASE_REF" HEAD\)\n.*worktree add --detach "\$RUNNER_TEMP\/base"[\s\S]*\.bin\/jscpd"\)\n.*GUARD_BASE=/);
  // No one-time baseline for a rule a PR turns on: the lint gate takes no config sources.
  assert.ok(['pnpm guard:lint', 'pnpm guard:baselines', 'pnpm guard:escapes'].every((r) => runs.includes(r)));
  assert.ok(!runs.some((r) => r.includes('--configs')));
  // A loosened lint config is an annotation, never a failure: the owner decides.
  const loosened = ci.jobs.guards.steps.find((s) => s.name === 'Lint config loosened?');
  assert.equal(loosened?.run, 'pnpm guard:loosened');
  assert.equal(loosened?.['continue-on-error'], true);
  assert.equal(ci.jobs.guards.steps[0].with?.['fetch-depth'], 0);
  assert.equal(ci.jobs.guards.if, "needs.changes.outputs.code == 'true' && needs.changes.outputs.verified != 'true'");
});

test('ci: e2e keeps the RUN_E2E switch and one database per shard', () => {
  assert.match(ci.jobs.e2e.if, /vars\.RUN_E2E != 'false'/);
  // The matrix comes from «changes»; its fallback (pushes, any failure) is the full one (e2e-areas/workflow.test.mjs).
  const fallback = JSON.parse(ci.jobs.e2e.strategy.matrix.match(/\|\| '(\{.*\})'\) \}\}$/)[1]);
  assert.deepEqual(
    fallback.include.map((m) => m.shard),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'single'],
  );
  assert.equal(ci.jobs.e2e.env.SHARDS, '${{ matrix.total }}');
  assert.ok(!('pull_request_target' in ci.on));
});

test('mobile.yml profile: preview by default (every automatic run), stripe-test only by hand, on its own channel', () => {
  const mobile = load('mobile.yml');
  const input = mobile.on.workflow_dispatch.inputs.profile;
  assert.deepEqual([input.type, input.options, input.default], ['choice', ['preview', 'stripe-test', 'production'], 'preview']);
  const dispatch = deploy.jobs.ota.steps.map((s) => s.run ?? '').join('\n');
  assert.doesNotMatch(dispatch, /profile|stripe/i, 'deploy-staging must leave the profile at preview');
  const step = (job, name) => mobile.jobs[job].steps.find((s) => s.name?.startsWith(name));
  assert.match(step('build', 'EAS build').run, /--profile "\$PROFILE"/);
  const guard = step('ota', 'Native-change guard');
  assert.match(guard.run, /--build-profile "\$PROFILE" --status finished/);
  assert.match(guard.run, /native-changes\.mjs "\$last" "\$PROFILE"/);
  for (const s of [guard, step('ota', 'EAS update')]) {
    assert.match(s.env.PROFILE, /^\$\{\{ inputs\.app == 'family' && .* \|\| inputs\.profile \|\| 'preview' \}\}$/);
  }
  // The build also takes the family production profile (mobile-family-production.test.mjs).
  assert.match(step('build', 'EAS build').env.PROFILE, / \|\| inputs\.profile \|\| 'preview' \}\}$/);
  const update = step('ota', 'EAS update').run;
  const [, side, normal] = update.split('exit 0'); // the family app's block first (mobile-family.test.mjs)
  assert.match(side, /if \[ "\$PROFILE" = stripe-test \]/);
  assert.match(side, /EXPO_PUBLIC_FEATURE_STRIPE=1 APP_VARIANT=stripetest/);
  assert.match(side, /--channel stripe-test --environment preview/);
  assert.deepEqual([/APP_VARIANT|channel/.test(normal), step('ota', 'EAS update').env.EXPO_PUBLIC_FEATURE_STRIPE], [false, '1']);
  assert.match(normal, /update --branch "\$EAS_BRANCH" --environment "\$EAS_BRANCH"/);
  assert.match(mobile['run-name'], /inputs\.profile == 'stripe-test' && 'stripe-test' \|\| inputs\.branch/);
});

test('release tags: only after a green release, no environment or secret, a failure never fails the run', () => {
  const mobile = load('mobile.yml');
  const [app, phone] = [deploy.jobs.release, mobile.jobs.release];
  for (const job of [app, phone]) {
    assert.deepEqual([job.permissions, job['continue-on-error'], job.environment], [{ contents: 'write' }, true, undefined]);
    assert.doesNotMatch(JSON.stringify(job), /secrets\./);
    assert.match(job.if, /^\$\{\{ !cancelled\(\) && /);
  }
  assert.match(app.if, /needs\.deploy\.result == 'success' && !inputs\.env_only/);
  assert.match(phone.if, /needs\.build\.result == 'success' \|\| needs\.ota\.result == 'success'/);
  const step = (job, kind) => job.steps.find((s) => s.env?.KIND === kind);
  assert.equal(step(app, 'app').env.SHA, '${{ github.event.workflow_run.head_sha || github.sha }}');
  assert.match(step(phone, 'apk').if, /^\$\{\{ needs\.build\.result == 'success' && /);
  assert.equal(step(phone, 'ota').if, "${{ needs.ota.result == 'success' }}");
  assert.equal(step(phone, 'ota').env.CHANNEL, mobile['run-name'].match(/\$\{\{ inputs\.app.*\}\}/)[0]);
  for (const s of [step(app, 'app'), step(phone, 'apk'), step(phone, 'aab'), step(phone, 'ota')]) {
    assert.match(s.run, /node tools\/scripts\/ci-checks\/release-tags\/release-tag\.mjs$/);
  }
  // The EAS link goes through a tee: pipefail keeps a failed build red.
  assert.match(mobile.jobs.build.steps.find((s) => s.id === 'eas').run, /set -o pipefail\n.*\| tee /);
});

test('deploy-staging merges LOGIN_CODE_PEPPER from a secret into the server .env (docs/30 §8)', () => {
  const step = deploy.jobs.deploy.steps.find((s) => s.name?.startsWith('Merge the server .env'));
  assert.equal(step.env.LOGIN_CODE_PEPPER, '${{ secrets.LOGIN_CODE_PEPPER }}');
  const keys = /keys="([^"]+)"/.exec(step.run)?.[1].split(/\s+/) ?? [];
  assert.ok(keys.includes('LOGIN_CODE_PEPPER'), 'the env-merge keys list');
  // Every key the step reads is merged, and every merged key comes from the step's env.
  assert.deepEqual([...keys].sort(), Object.keys(step.env).sort());
});
