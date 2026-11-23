import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const read = (path) => readFileSync(new URL(`../../../../../../${path}`, import.meta.url), 'utf8');

test('ci.yml guards job runs pnpm guard:escapes, so a new escape comment fails a PR', () => {
  const steps = parse(read('.github/workflows/ci.yml')).jobs.guards.steps;
  assert.ok(steps.some((s) => s.run === 'pnpm guard:escapes'));
});

test('package.json guard:escapes runs the escapes gate', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['guard:escapes'], 'node tools/scripts/ci-checks/lint/escapes/gate.mjs');
});
