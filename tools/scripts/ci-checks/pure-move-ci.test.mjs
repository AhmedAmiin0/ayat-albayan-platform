// The refactor job's pure-move step runs for move PRs: refactor/* and cloud/refactor-* heads of any lane, and
// any head whose diff adds or changes a refactor/moves/*.json map (docs/32 critic correction 5).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ci = parse(readFileSync(fileURLToPath(new URL('../../../.github/workflows/ci.yml', import.meta.url)), 'utf8'));
const step = ci.jobs.refactor.steps.find((s) => s.name === 'Pure-move check');

/** A fake `git` on PATH: prints its args to stderr and `$FAKE_MAPS` (the diff's changed maps) to stdout. */
const bin = mkdtempSync(join(tmpdir(), 'pure-move-ci-'));
writeFileSync(join(bin, 'git'), '#!/usr/bin/env bash\necho "git $*" >&2\nprintf "%s" "$FAKE_MAPS"\n');
chmodSync(join(bin, 'git'), 0o755);

/** What the step's script does for a head branch and changed maps, its node command replaced by an echo. */
const runFor = (head, maps = '') =>
  execFileSync('bash', ['-ec', step.run.replace(/\bnode tools\//, 'echo RUN tools/')], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HEAD_REF: head, BASE_REF: 'develop', FAKE_MAPS: maps },
    encoding: 'utf8',
  });
const RUN = /^RUN tools\/scripts\/ci-checks\/pure-move-check\.mjs origin\/develop HEAD$/m;

test('ci: the pure-move step runs the checker against the base branch', () => {
  assert.equal(step.env.HEAD_REF, '${{ github.head_ref }}');
  assert.match(step.run, /node tools\/scripts\/ci-checks\/pure-move-check\.mjs "origin\/\$BASE_REF" HEAD/);
  assert.match(step.run, /git diff --name-only --diff-filter=AMR "origin\/\$BASE_REF\.\.\.HEAD" -- 'refactor\/moves\/\*\.json'/);
});

test('ci: the pure-move step runs on refactor/* and cloud/refactor-* heads of any lane', () => {
  for (const head of ['refactor/web-x', 'refactor/assistant-pay-folders', 'cloud/refactor-e12', 'cloud/refactor-a1', 'cloud/refactor-d20b']) {
    assert.match(runFor(head), RUN, head);
  }
});

test('ci: any other head runs it when its diff adds or changes a move map', () => {
  for (const head of ['cloud/review-g1b', 'feat/x', 'refactor']) {
    assert.match(runFor(head, 'refactor/moves/k1a.json'), RUN, head);
  }
});

test('ci: the pure-move step is skipped on every other head without a map', () => {
  for (const head of ['feat/refactor-x', 'cloud/pure-move-suppressions', 'fix/refactor/web', 'docs/x', 'develop', 'refactor']) {
    assert.match(runFor(head), /^not a move PR/, head);
  }
});
