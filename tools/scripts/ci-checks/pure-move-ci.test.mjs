// The refactor job's pure-move step runs for move PRs only: refactor/* and cloud/refactor-* heads, any lane.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ci = parse(readFileSync(fileURLToPath(new URL('../../../.github/workflows/ci.yml', import.meta.url)), 'utf8'));
const step = ci.jobs.refactor.steps.find((s) => s.name === 'Pure-move check');

/** What the step's script does for a head branch, its node command replaced by an echo. */
const runFor = (head) =>
  execFileSync('bash', ['-ec', step.run.replace(/^(\s*\S+\)\s*)node /m, '$1echo RUN ')], {
    env: { ...process.env, HEAD_REF: head, BASE_REF: 'develop' },
    encoding: 'utf8',
  });

test('ci: the pure-move step runs the checker against the base branch', () => {
  assert.equal(step.env.HEAD_REF, '${{ github.head_ref }}');
  assert.match(step.run, /node tools\/scripts\/ci-checks\/pure-move-check\.mjs "origin\/\$BASE_REF" HEAD/);
});

test('ci: the pure-move step runs on refactor/* and cloud/refactor-* heads of any lane', () => {
  for (const head of ['refactor/web-x', 'refactor/assistant-pay-folders', 'cloud/refactor-e12', 'cloud/refactor-a1', 'cloud/refactor-d20b']) {
    assert.match(runFor(head), /^RUN tools\/scripts\/ci-checks\/pure-move-check\.mjs origin\/develop HEAD$/m, head);
  }
});

test('ci: the pure-move step is skipped on every other head', () => {
  for (const head of ['feat/refactor-x', 'cloud/pure-move-suppressions', 'fix/refactor/web', 'docs/x', 'develop', 'refactor']) {
    assert.match(runFor(head), /^not a move PR/, head);
  }
});
