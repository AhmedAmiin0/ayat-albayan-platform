// ci «verify (lint + parity (oxlint))» (2026-11-17): Oxlint parity reads the lint row's own ESLint
// run (eslint-findings.mjs) and Oxlint report instead of a second job running both again.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// turbo.json is in every task's global hash, so it is no test input of its own.
const readRoot = (path) =>
  readFileSync(fileURLToPath(new URL(`../../../../../${path}`, import.meta.url)), 'utf8');
const ci = parse(readRoot('.github/workflows/ci.yml'));
const FORMATTER = 'tools/scripts/ci-checks/lint/parity/eslint-findings.mjs';

test('ci: lint parity reads the lint row\'s own ESLint run and Oxlint report, and still gates', () => {
  assert.equal(ci.jobs['lint-parity'], undefined, 'no second ESLint job');
  const row = ci.jobs.verify.strategy.matrix.include.find((r) => r.task === 'lint');
  assert.equal(row.name, 'lint + parity (oxlint)');
  assert.match(row.opts, /--continue/, 'every package saves its findings');
  assert.equal(row.args, `-- -f "$GITHUB_WORKSPACE/${FORMATTER}"`);
  const step = (name) => ci.jobs.verify.steps.find((s) => s.name === name);
  assert.equal(step('Oxlint (every rule)').run, 'pnpm lint:oxfull');
  const parity = step('Parity with ESLint');
  assert.equal(parity.run, 'pnpm lint:parity');
  assert.deepEqual(
    [parity.env.LINT_PARITY_ESLINT, parity.env.LINT_PARITY_OXLINT],
    ['${{ github.workspace }}', 'oxlint-report.json'],
  );
  // They run after a red ESLint too: both gates report on every run.
  for (const s of [step('Oxlint (every rule)'), parity])
    assert.match(s.if, /^\$\{\{ !cancelled\(\) && matrix\.task == 'lint'/);
  assert.match(step('Oxlint baselines to prune (commit this diff)').run, /lint:oxfull -- --prune/);
  const turbo = JSON.parse(readRoot('turbo.json'));
  assert.deepEqual(turbo.tasks.lint.outputs, ['.lint/**']);
  assert.ok(turbo.tasks.lint.inputs.includes(`$TURBO_ROOT$/${FORMATTER}`));
});
