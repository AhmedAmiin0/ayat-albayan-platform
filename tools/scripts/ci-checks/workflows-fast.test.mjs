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
const deploy = load('deploy-production.yml');
const ci = load('ci.yml');

test('production deploys skip migrate only when plan said exactly "false"', () => {
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

test('ci: Wave F guards fail the build (folder cap strict, jscpd, knip, queries and lint gates)', () => {
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
  const lint = runs.find((r) => r.includes('pnpm guard:lint -- --configs'));
  assert.ok(lint?.includes('if [ -z "${GUARD_BASE:-}" ]; then pnpm guard:lint; exit; fi'));
  // A rule the PR turns on (named only in the head's ESLint configs) gets its one-time baseline.
  assert.match(lint, /--configs "\$RUNNER_TEMP\/configs-base\.txt" "\$RUNNER_TEMP\/configs-head\.txt"/);
  assert.equal(ci.jobs.guards.steps[0].with?.['fetch-depth'], 0);
  assert.equal(ci.jobs.guards.if, "needs.changes.outputs.code == 'true'");
});

test('ci: a red lint prints the pruned suppressions to commit', () => {
  const step = ci.jobs.verify.steps.find((s) => s.name?.startsWith('Suppressions to prune'));
  assert.equal(step?.if, "failure() && steps.turbo.outcome == 'failure' && matrix.task == 'lint'");
  assert.match(step.run, /pnpm lint:prune .*\|\| true\n.*git --no-pager diff -- '\*eslint-suppressions\.json'/);
});

test('ci: e2e keeps the RUN_E2E switch and one database per shard', () => {
  assert.match(ci.jobs.e2e.if, /vars\.RUN_E2E != 'false'/);
  // The matrix comes from «changes»; its fallback (pushes, any failure) is the full one (e2e-areas/workflow.test.mjs).
  const fallback = JSON.parse(ci.jobs.e2e.strategy.matrix.match(/\|\| '(\{.*\})'\) \}\}$/)[1]);
  assert.deepEqual(
    fallback.include.map((m) => m.shard),
    ['1', '2', '3', '4', '5', '6', '7', '8', 'single'],
  );
  assert.equal(ci.jobs.e2e.env.SHARDS, '${{ matrix.total }}');
  assert.ok(!('pull_request_target' in ci.on));
});

test('mobile.yml profile: preview by default (production), the side apps on their own channel', () => {
  const mobile = load('mobile.yml');
  const input = mobile.on.workflow_dispatch.inputs.profile;
  assert.deepEqual([input.type, input.options, input.default], ['choice', ['preview', 'stripe-test', 'staging'], 'preview']);
  const dispatch = deploy.jobs.ota.steps.map((s) => s.run ?? '').join('\n');
  assert.doesNotMatch(dispatch, /profile|stripe/i, 'deploy-production must leave the profile at preview');
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
  assert.match(side, /if \[ "\$PROFILE" != preview \]/);
  // A side app's bundle gets its eas.json profile env (APP_VARIANT, staging hosts, Stripe flag).
  assert.match(side, /require\("\.\/eas\.json"\)\.build\[process\.env\.PROFILE\]\.env\)/);
  assert.match(side, /--channel "\$PROFILE" --environment "\$\(node -p 'require\("\.\/eas\.json"\)\.build\[process\.env\.PROFILE\]\.environment'\)"/);
  assert.doesNotMatch(normal, /STRIPE|APP_VARIANT|channel/);
  assert.match(normal, /update --branch "\$EAS_BRANCH" --environment "\$EAS_BRANCH"/);
  assert.match(mobile['run-name'], /inputs\.profile != 'preview' && inputs\.profile \|\| inputs\.branch/);
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
  assert.equal(step(app, 'app').env.SHA, '${{ inputs.sha || github.sha }}');
  assert.equal(step(phone, 'apk').if, "${{ needs.build.result == 'success' }}");
  assert.equal(step(phone, 'ota').if, "${{ needs.ota.result == 'success' }}");
  assert.equal(step(phone, 'ota').env.CHANNEL, mobile['run-name'].match(/\$\{\{ inputs\.profile.*\}\}/)[0]);
  for (const s of [step(app, 'app'), step(phone, 'apk'), step(phone, 'ota')]) {
    assert.match(s.run, /node tools\/scripts\/ci-checks\/release-tags\/release-tag\.mjs$/);
  }
  // The EAS link goes through a tee: pipefail keeps a failed build red.
  assert.match(mobile.jobs.build.steps.find((s) => s.id === 'eas').run, /set -o pipefail\n.*\| tee /);
});

test('deploy-production merges LOGIN_CODE_PEPPER from a secret into the server .env (docs/30 §8)', () => {
  const step = deploy.jobs.deploy.steps.find((s) => s.name?.startsWith('Merge the server .env'));
  assert.equal(step.env.LOGIN_CODE_PEPPER, '${{ secrets.LOGIN_CODE_PEPPER }}');
  const keys = /keys="([^"]+)"/.exec(step.run)?.[1].split(/\s+/) ?? [];
  assert.ok(keys.includes('LOGIN_CODE_PEPPER'), 'the env-merge keys list');
  // Every key the step reads is merged, and every merged key comes from the step's env.
  assert.deepEqual([...keys].sort(), Object.keys(step.env).sort());
});
