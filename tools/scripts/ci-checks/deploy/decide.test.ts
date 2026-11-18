import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decide, type Facts } from './decide.ts';

const SHA = 'a'.repeat(40);
const INPUTS = ['apps/api/', 'packages/shared/', 'pnpm-lock.yaml', 'deploy/staging/'];
const keep = (facts: Facts): boolean => decide(facts, INPUTS).keep;

test('an unknown last deploy or a failed diff builds (fail safe)', () => {
  assert.equal(keep({ base: null, changed: null }), false);
  assert.equal(keep({ base: null, changed: ['docs/a.md'] }), false);
  assert.equal(keep({ base: SHA, changed: null }), false);
  assert.match(decide({ base: SHA, changed: null }, INPUTS).reason, /git could not diff a{40}/);
});

test('any API input in the diff builds', () => {
  for (const file of ['apps/api/src/main.ts', 'packages/shared/x.ts', 'pnpm-lock.yaml'])
    assert.equal(keep({ base: SHA, changed: ['apps/staff-web/a.tsx', file] }), false, file);
  assert.equal(keep({ base: SHA, changed: ['deploy/staging/roll.sh'] }), false);
  const many = Array.from({ length: 7 }, (_, i) => `apps/api/f${String(i)}.ts`);
  assert.match(decide({ base: SHA, changed: many }, INPUTS).reason, /f4\.ts \(\+2\)$/);
});

test('no API input in the diff keeps the image, an empty diff (a redeploy) too', () => {
  const web = ['apps/staff-web/src/a.tsx', 'docs/09-deployment.md', 'packages/shared-ui/x.ts'];
  assert.equal(keep({ base: SHA, changed: web }), true);
  assert.equal(keep({ base: SHA, changed: [] }), true);
  assert.match(decide({ base: SHA, changed: [] }, INPUTS).reason, /since a{40}$/);
});
