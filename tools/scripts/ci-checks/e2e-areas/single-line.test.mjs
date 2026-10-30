// The «e2e (single line)» smoke set in ci.yml: every spec filter it passes to Playwright must match
// exactly one spec file, wherever the spec lives under e2e/tests/ (domain folders, D8).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { listSpecs } from './areas.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

/** The spec filters of the single-line branch of the e2e run step. */
function singleLineFilters() {
  const ci = parse(readFileSync(`${root}.github/workflows/ci.yml`, 'utf8'));
  const step = ci.jobs.e2e.steps.find((s) => typeof s.run === 'string' && s.run.includes('single'));
  const branch = step.run.split(/\belse\b/)[0];
  return branch.split(/\s+/).filter((w) => w.endsWith('.spec.ts'));
}

test('the single-line smoke set names the six journeys and two more specs', () => {
  const filters = singleLineFilters();
  assert.equal(filters.length, 8);
  assert.equal(filters.filter((f) => f.startsWith('journey-')).length, 6);
});

test('each single-line filter matches exactly one spec file, at any folder depth', () => {
  const specs = listSpecs(root).map((s) => `e2e/tests/${s}`);
  for (const filter of singleLineFilters()) {
    const re = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    assert.deepEqual(specs.filter((s) => re.test(s)).length, 1, filter);
  }
});
