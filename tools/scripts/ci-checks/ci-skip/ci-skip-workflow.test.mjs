// ci.yml: develop skips verify and guards only for a tree a green PR run already checked; e2e,
// baselines and the required «check» keep their meaning (verified-tree.mjs, docs/09).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const read = (p) => readFileSync(fileURLToPath(new URL(`../../../../${p}`, import.meta.url)), 'utf8');
const ci = parse(read('.github/workflows/ci.yml'));
const SKIP = "needs.changes.outputs.code == 'true' && needs.changes.outputs.verified != 'true'";

test('verify and guards skip only on verified; e2e never does', () => {
  assert.equal(ci.jobs.verify.if, SKIP);
  assert.equal(ci.jobs.guards.if, SKIP);
  assert.doesNotMatch(ci.jobs.e2e.if, /verified/);
});

test('e2e skips only sub-PRs into a contracts base; develop PRs and every push keep it', () => {
  const cond = ci.jobs.e2e.if;
  const lane = "startsWith(github.base_ref, 'lane/contracts-')";
  assert.ok(cond.includes(`!(github.event_name == 'pull_request' && ${lane})`));
  assert.equal(cond.split('base_ref').length, 2, 'no other base branch is named');
});

test('changes: only develop pushes ask, behind the VERIFIED_TREE_SKIP switch, and fail safe', () => {
  const { steps, outputs } = ci.jobs.changes;
  assert.equal(outputs.verified, '${{ steps.verified.outputs.verified }}');
  assert.equal(outputs.tree, '${{ steps.diff.outputs.tree }}');
  assert.match(steps.find((s) => s.id === 'diff').run, /echo "tree=\$\(git rev-parse 'HEAD\^\{tree\}'\)"/);
  const gate = steps.find((s) => s.id === 'skip').if;
  assert.match(gate, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/develop'/);
  assert.match(gate, /vars\.VERIFIED_TREE_SKIP != 'false'/);
  const ask = steps.find((s) => s.id === 'verified');
  assert.equal(ask['continue-on-error'], true, 'an error leaves verified unset: everything runs');
  assert.match(ask.run, /files=\$\(git diff --name-only "\$BEFORE" HEAD\)\n/);
  assert.match(ask.run, /verified-tree\.mjs "\$TREE" <<< "\$files"$/m);
});

test('check: verified passes only on a push with verify and guards skipped; PRs leave the mark', () => {
  const steps = ci.jobs.check.steps;
  const run = steps[0].run;
  assert.match(
    run,
    /\[ "\$VERIFIED" = true \] && \[ "\$GITHUB_EVENT_NAME" = push \] && \[ "\$VERIFY" = skipped \] && \[ "\$GUARDS" = skipped \]/,
  );
  assert.match(run, /test "\$VERIFY" = success\n\s*test "\$GUARDS" = success/);
  const green = steps.find((s) => s.id === 'green');
  for (const need of ['verify', 'guards', 'refactor'])
    assert.match(green.if, new RegExp(`needs\\.${need}\\.result == 'success'`));
  assert.match(green.if, /^github\.event_name == 'pull_request' && needs\.changes\.outputs\.code == 'true'/);
  const upload = steps.find((s) => s.uses?.startsWith('actions/upload-artifact'));
  assert.equal(upload.with.name, 'ci-green-tree-${{ needs.changes.outputs.tree }}');
  assert.equal(upload.if, "steps.green.outcome == 'success'");
});
