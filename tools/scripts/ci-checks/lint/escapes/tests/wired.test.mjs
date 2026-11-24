// The escapes guard runs on every PR: the guards job of ci.yml calls it through its package script.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = (p) => fileURLToPath(new URL(`../../../../../../${p}`, import.meta.url));
const ci = parse(readFileSync(root('.github/workflows/ci.yml'), 'utf8'));
const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8'));

test('the guards job runs pnpm guard:escapes', () => {
  const steps = ci.jobs.guards.steps ?? [];
  assert.ok(steps.some((step) => step.run === 'pnpm guard:escapes'));
});

test('guard:escapes is the escapes gate', () => {
  assert.equal(pkg.scripts['guard:escapes'], 'node tools/scripts/ci-checks/lint/escapes/gate.mjs');
});
