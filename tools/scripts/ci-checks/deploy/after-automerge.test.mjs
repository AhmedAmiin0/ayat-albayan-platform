// A merge by lane-automerge fires no push, and the ci run it starts with the built-in token sends
// deploy-staging no workflow_run. That ci run ends by starting the deploy itself, for its own
// commit (docs/09 «Lane auto-merge»).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../../${p}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const text = read('.github/workflows/deploy-staging.yml');
const deploy = parse(text);
const BOT = 'github-actions[bot]';
const SHA = 'a'.repeat(40);
const SCOPE = ['github', 'needs', 'inputs', 'cancelled'];

/** A workflow `if` evaluated as JS: strings and booleans compare the same way in both. */
function holds(cond, scope) {
  const js = cond.replace(/^\$\{\{|\}\}\s*$/g, '').replace(/([!=])=/g, '$1==');
  return Boolean(new Function(...SCOPE, `return ${js};`)(...SCOPE.map((name) => scope[name])));
}

const results = (check, e2e) => ({ check: { result: check }, e2e: { result: e2e } });
const dispatched = (ref, actor) => ({
  event_name: 'workflow_dispatch',
  ref,
  triggering_actor: actor,
});
const ciRun = (over) => ({
  cancelled: () => false,
  needs: results('success', 'success'),
  github: dispatched('refs/heads/develop', BOT),
  ...over,
});

test('ci starts the deploy only on the green develop run that lane-automerge started', () => {
  const starts = (over) => holds(ci.jobs['start-deploy'].if, ciRun(over));
  assert.equal(starts({}), true);
  assert.equal(starts({ needs: results('success', 'skipped') }), true, 'e2e not needed');
  const never = {
    cancelled: { cancelled: () => true },
    'check failed': { needs: results('failure', 'success') },
    'e2e failed': { needs: results('success', 'failure') },
    'e2e cancelled': { needs: results('success', 'cancelled') },
    push: { github: { ...dispatched('refs/heads/develop', BOT), event_name: 'push' } },
    'another branch': { github: dispatched('refs/heads/lane/x', BOT) },
    'started by a person': { github: dispatched('refs/heads/develop', 'someone') },
  };
  for (const [name, over] of Object.entries(never)) assert.equal(starts(over), false, name);
});

test('every job that can fail a ci run stands behind the deploy job', () => {
  const job = ci.jobs['start-deploy'];
  assert.deepEqual(job.needs, ['check', 'e2e']);
  const behind = new Set([...ci.jobs.check.needs, ...job.needs, 'start-deploy']);
  const free = Object.keys(ci.jobs).filter((name) => !behind.has(name));
  assert.deepEqual(free.filter((name) => ci.jobs[name]['continue-on-error'] !== true), []);
});

test('the deploy job may only start a workflow, and names the commit ci passed on', () => {
  const job = ci.jobs['start-deploy'];
  assert.deepEqual(job.permissions, { actions: 'write' });
  assert.equal(job.environment, undefined);
  assert.doesNotMatch(JSON.stringify(job), /secrets\./);
  assert.equal(job.steps.length, 1);
  assert.deepEqual(job.steps[0].env, { GH_TOKEN: '${{ github.token }}' });
  const start = 'gh workflow run deploy-staging.yml --repo "$GITHUB_REPOSITORY" --ref develop';
  assert.equal(job.steps[0].run.trim(), `${start} -f sha="$GITHUB_SHA"`);
});

test('deploy-staging reads the named commit first, everywhere it reads a commit', () => {
  assert.equal(deploy.on.workflow_dispatch.inputs.sha.type, 'string');
  assert.equal(deploy.on.workflow_dispatch.inputs.sha.default, '');
  const count = (part) => text.split(part).length - 1;
  const reads = count('github.event.workflow_run.head_sha');
  assert.ok(reads > 0);
  assert.equal(count('inputs.sha || github.event.workflow_run.head_sha || github.sha'), reads);
});

const planned = (migrations) => ({
  preflight: { outputs: { ready: 'true' } },
  plan: { outputs: { migrations } },
});
const deployRun = (over) => ({
  cancelled: () => false,
  github: { event_name: 'workflow_dispatch' },
  needs: planned('true'),
  inputs: { sha: SHA, migrate: true, env_only: false },
  ...over,
});

test('a deploy started by ci decides migrations as an automatic run does', () => {
  const migrates = (over) => holds(deploy.jobs.migrate.if, deployRun(over));
  assert.equal(migrates({}), true);
  assert.equal(migrates({ needs: planned('false') }), false, 'plan proved nothing changed');
  assert.equal(migrates({ needs: planned('') }), true, 'a failed plan never skips migrate');
  const auto = (plan) =>
    migrates({ github: { event_name: 'workflow_run' }, inputs: {}, needs: planned(plan) });
  assert.deepEqual([auto('true'), auto(''), auto('false')], [true, true, false]);
  const byHand = (inputs) => migrates({ needs: planned('false'), inputs: { sha: '', ...inputs } });
  assert.equal(byHand({ migrate: true, env_only: false }), true, 'by hand: the inputs decide');
  assert.equal(byHand({ migrate: false, env_only: false }), false);
  assert.equal(byHand({ migrate: true, env_only: true }), false);
  const envOnly = { sha: SHA, migrate: true, env_only: true };
  assert.equal(migrates({ inputs: envOnly }), false, 'env only never migrates');
});

/** Runs preflight's commit check with a fake gh that answers `state` for the compare call. */
function commitCheck(sha, state) {
  const step = deploy.jobs.preflight.steps.find((s) => s.name === 'The named commit is on develop');
  const dir = mkdtempSync(join(tmpdir(), 'named-commit-'));
  writeFileSync(join(dir, 'gh'), `#!/bin/sh\necho "$*" > ${join(dir, 'call')}\necho ${state}\n`);
  chmodSync(join(dir, 'gh'), 0o755);
  const env = { PATH: `${dir}${delimiter}${process.env.PATH}`, SHA: sha, GITHUB_REPOSITORY: 'o/r' };
  try {
    execFileSync('bash', ['-eo', 'pipefail', '-c', step.run], { env, stdio: 'pipe' });
    return readFileSync(join(dir, 'call'), 'utf8').trim();
  } catch {
    return 'refused';
  }
}

test('preflight refuses a named commit that develop does not hold', () => {
  const step = deploy.jobs.preflight.steps.find((s) => s.name === 'The named commit is on develop');
  assert.equal(step.if, '${{ inputs.sha }}');
  assert.deepEqual(step.env, { GH_TOKEN: '${{ github.token }}', SHA: '${{ inputs.sha }}' });
  const call = `api repos/o/r/compare/${SHA}...develop --jq .status`;
  assert.equal(commitCheck(SHA, 'ahead'), call);
  assert.equal(commitCheck(SHA, 'identical'), call);
  for (const state of ['behind', 'diverged', '']) assert.equal(commitCheck(SHA, state), 'refused');
  for (const sha of ['develop', SHA.slice(1), `${SHA};id`, 'A'.repeat(40)]) {
    assert.equal(commitCheck(sha, 'ahead'), 'refused', sha);
  }
});
