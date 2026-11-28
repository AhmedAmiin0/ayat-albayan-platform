import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { run } from '../cli.ts';
import { aPull, aRun, aYieldFacts, SELF } from '../testing/yield.builder.ts';

const ENV = { RUN_ID: String(SELF.run), PR: String(SELF.pr), REPO: SELF.repo };

function gathered(over: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'ci-yield-'));
  for (const [name, value] of Object.entries({ ...aYieldFacts(), ...over }))
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
  return dir;
}

test('prints wait= and reason= from what the workflow gathered', () => {
  assert.deepEqual(run(gathered(), ENV), ['wait=false', 'reason=no priority run ahead']);
  const runs = [...aYieldFacts().runs, aRun({ id: 9, head_branch: 'develop', event: 'push' })];
  assert.deepEqual(run(gathered({ runs }), ENV), ['wait=true', 'reason=waiting for develop']);
});

test('gh output or an environment of the wrong shape fails loudly', () => {
  assert.throws(() => run(gathered({ runs: [{ id: 'x' }] }), ENV));
  assert.throws(() => run(gathered({ pulls: [{ ...aPull(), labels: [{ name: 'p' }] }] }), ENV));
  assert.throws(() => run(gathered(), { ...ENV, PR: '' }));
});
