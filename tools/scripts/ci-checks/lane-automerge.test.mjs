// lane-automerge.yml merges low-risk lane PRs (tools/scripts/automerge/). A merge made with the
// built-in token starts no push workflow, so it dispatches ci on develop and staging still deploys.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import { SELF } from '../automerge/checks.ts';
import { LABEL } from '../automerge/lanes.ts';

const read = (f) => parse(readFileSync(new URL(`../../../.github/workflows/${f}`, import.meta.url), 'utf8'));
const lane = read('lane-automerge.yml');
const deploy = read('deploy-staging.yml');
const job = lane.jobs.automerge;
const script = job.steps.map((s) => s.run ?? '').join('\n');

test('lane-automerge: triggers, one merge at a time, the token permissions it needs', () => {
  assert.deepEqual(lane.on.workflow_run, { workflows: ['ci'], types: ['completed'] });
  assert.deepEqual(lane.on.pull_request, { types: ['labeled'] });
  assert.equal(lane.on.schedule.length, 1);
  assert.deepEqual(lane.concurrency, { group: 'lane-automerge', 'cancel-in-progress': false });
  assert.deepEqual(lane.permissions, { contents: 'read' });
  const perms = { contents: 'write', 'pull-requests': 'write', checks: 'read', actions: 'write', statuses: 'read' };
  assert.deepEqual(job.permissions, perms);
  assert.equal(job.name, SELF, 'checks.ts ignores this job by its name');
  assert.ok(!JSON.stringify(lane).includes('secrets.'), 'no secret, only github.token');
});

test('lane-automerge: only PR ci runs, the label on a same-repo PR, or the schedule start it', () => {
  assert.match(job.if, /github\.event_name == 'schedule'/);
  assert.match(job.if, /github\.event\.workflow_run\.event == 'pull_request'/);
  assert.match(job.if, new RegExp(`github\\.event\\.label\\.name == '${LABEL}'`));
  assert.match(job.if, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.equal(job.steps[0].with.ref, 'develop', 'the decision script always comes from develop');
  assert.equal(job.steps[0].with['persist-credentials'], false);
});

test('lane-automerge: re-checks, squashes on the checked head and dispatches ci on develop', () => {
  assert.match(script, new RegExp(`--label ${LABEL}`));
  assert.match(script, /node tools\/scripts\/automerge\/cli\.ts "\$2"/);
  assert.equal(script.match(/decide "\$n" "\$d"/g)?.length, 2, 'decide, then re-check');
  assert.match(script, /gh pr merge "\$n" --repo "\$REPO" --squash --match-head-commit "\$sha"/);
  assert.match(script, /--subject "\$\(cat "\$d\/subject\.txt"\)" --body-file "\$d\/body\.txt"/);
  assert.match(script, /gh workflow run ci\.yml --repo "\$REPO" --ref develop/);
  assert.match(script, /layer|annotations/);
});

test('lane-automerge: gathers the reviewed path facts from GitHub, not from git dates', () => {
  assert.match(script, /issues\/\$n\/events\?per_page=100" --paginate/);
  assert.match(script, /select\(\.event == "labeled" or \.event == "head_ref_force_pushed"\)/);
  assert.match(script, /commits\/\$sha\/check-suites\?per_page=100" --paginate/);
  assert.match(script, /\{filename, previous_filename\}/);
  for (const f of ['events', 'suites']) assert.match(script, new RegExp(`> "\\$d/${f}\\.json"`));
});

test('lane-automerge: what develop gained since the merge base comes from git', () => {
  const has = (text) => assert.ok(script.includes(text), text);
  has('compare/develop...$sha?per_page=1');
  has('[[ $1 =~ ^[0-9a-f]{40}$ && $2 =~ ^[0-9a-f]{40}$ ]] || return 1');
  has('[[ $1 == "$2" ]] && return 0');
  has('git fetch -q --depth=1 --filter=blob:none origin "$1" "$2" || return 1');
  has(`git diff -z --name-only --no-renames "$1" "$2" | tr '\\0' '\\n'`);
  has('if names=$(gained "$base" "$tip"); then');
  has(`jq -s '{known: true, files: .}' > "$d/behind.json"`);
  has('::warning::#$n: what develop changed could not be read');
  has(`echo '{"known": false, "files": []}' > "$d/behind.json"`);
  assert.ok(!script.includes('compare.json'), 'cli.ts reads behind.json, not the compare answer');
});

test('lane-automerge: each check run keeps its id, so a newer run is told from an older one', () => {
  const kept = `jq '[.[] | {id, name, status, conclusion}]' "$d/runs.json" > "$d/checks.json"`;
  assert.ok(script.includes(kept), kept);
});

/** deploy-staging's preflight `if`, evaluated for one ci run (GitHub `==` on these strings). */
function preflight(run, eventName = 'workflow_run') {
  const github = { event_name: eventName, repository: 'o/r', event: { workflow_run: run } };
  const js = deploy.jobs.preflight.if.replace(/==/g, '===');
  return new Function('github', `return ${js};`)(github);
}

const ciRun = (over) => ({
  conclusion: 'success', event: 'push', head_branch: 'develop',
  head_repository: { full_name: 'o/r' }, ...over,
});

test('deploy-staging deploys a green ci on develop pushed or dispatched by lane-automerge', () => {
  assert.equal(preflight(ciRun({})), true);
  assert.equal(preflight(ciRun({ event: 'workflow_dispatch' })), true);
  assert.equal(preflight({}, 'workflow_dispatch'), true);
});

test('deploy-staging never deploys a red, PR, other-branch or fork ci run', () => {
  const cases = [
    { conclusion: 'failure' },
    { conclusion: 'failure', event: 'workflow_dispatch' },
    { event: 'pull_request' },
    { event: 'workflow_dispatch', head_branch: 'feature/x' },
    { event: 'push', head_branch: 'main' },
    { event: 'workflow_dispatch', head_repository: { full_name: 'fork/r' } },
    { event: 'schedule' },
  ];
  for (const c of cases) assert.equal(preflight(ciRun(c)), false, JSON.stringify(c));
});
