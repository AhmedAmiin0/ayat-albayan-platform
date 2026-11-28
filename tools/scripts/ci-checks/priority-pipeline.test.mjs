// The `priority` flag (docs/09 «Priority»): fix/, hotfix/ and ci/ PRs are labelled, their ci
// runs first (ci job «yield to priority») and they merge themselves (automerge/priority.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import { PRIORITY } from '../automerge/priority.ts';

const WORKFLOWS = new URL('../../../.github/workflows/', import.meta.url);
const text = (f) => readFileSync(new URL(f, WORKFLOWS), 'utf8');
const ci = parse(text('ci.yml'));
const labeller = parse(text('priority-label.yml'));
const lane = parse(text('lane-automerge.yml'));
const laneScript = lane.jobs.automerge.steps.map((s) => s.run ?? '').join('\n');
const PREFIXES = ['fix/', 'hotfix/', 'ci/'];
const STARTS = /startsWith\(github\.head_ref, '([^']+)'\)/g;
const prefixes = (expr) => [...expr.matchAll(STARTS)].map((m) => m[1]);

test('priority-label labels same-repo fix/, hotfix/ and ci/ PRs with the built-in token', () => {
  assert.deepEqual(labeller.on.pull_request, { types: ['opened', 'reopened', 'ready_for_review'] });
  assert.deepEqual(labeller.permissions, { contents: 'read' });
  const job = labeller.jobs.label;
  assert.deepEqual(job.permissions, { 'pull-requests': 'write' });
  assert.deepEqual(prefixes(job.if), PREFIXES);
  assert.match(job.if, /head\.repo\.full_name == github\.repository/);
  assert.match(job.steps[0].run, new RegExp(`labels\\[\\]=${PRIORITY}'`));
  assert.ok(!text('priority-label.yml').includes('secrets.'), 'no secret');
});

test('ci: every job waits for «yield to priority», which never skips itself', () => {
  const job = ci.jobs.yield;
  assert.equal(job.name, 'yield to priority');
  assert.equal(job.if, undefined, 'a skipped job would skip every job that needs it');
  assert.deepEqual(job.permissions, { contents: 'read', actions: 'read', 'pull-requests': 'read' });
  const free = Object.entries(ci.jobs).filter(([, j]) => [j.needs ?? []].flat().length === 0);
  const names = free.map(([name]) => name);
  assert.deepEqual(names, ['yield'], 'every other job runs after it');
  for (const root of ['changes', 'refactor', 'secret-scan'])
    assert.equal(ci.jobs[root].needs, 'yield', root);
  assert.ok(ci.jobs.check && ci.jobs.guards && !ci.jobs.check.name && !ci.jobs.guards.name);
});

test('ci: only non-priority PR runs wait, at most 30 minutes, by polling once a minute', () => {
  const job = ci.jobs.yield;
  assert.match(job.env.YIELD, /github\.event_name == 'pull_request'/);
  assert.match(job.env.YIELD, new RegExp(`labels\\.\\*\\.name, '${PRIORITY}'`));
  assert.deepEqual(prefixes(job.env.YIELD), PREFIXES, 'the branches priority-label labels');
  for (const step of job.steps) assert.equal(step.if, "env.YIELD == 'true'");
  const wait = job.steps.at(-1).run;
  assert.match(wait, /# poll: GitHub Actions has no run-priority event/);
  assert.match(wait, /end=\$\(\(SECONDS \+ 1800\)\)/);
  assert.match(wait, /sleep 60/);
  assert.match(wait, /node tools\/scripts\/automerge\/ci-yield\/cli\.ts "\$d"/);
  assert.ok(job['timeout-minutes'] > 31, 'the wait ends before the job times out');
});

test('lane-automerge: priority PRs are listed, queued first, updated on the checked head', () => {
  const labelled = new RegExp(`github\\.event\\.label\\.name == '${PRIORITY}'`);
  assert.match(lane.jobs.automerge.if, labelled);
  assert.match(laneScript, new RegExp(`--label ${PRIORITY} --state open`));
  const has = (part) => assert.ok(laneScript.includes(part), part);
  has('prs=$(node tools/scripts/automerge/queue/order.ts "$RUNNER_TEMP/prs.json")');
  has('pulls/$n/update-branch" -f expected_head_sha="$sha"');
  has('gh workflow run ci.yml --repo "$REPO" --ref "$(jq -r .headRefName "$d/pr.json")"');
});
