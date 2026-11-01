// refactor/lanes-v2/<L>.md are cloud-routine prompts: each carries its own lane's block and claim, never a copy of
// another lane's (hzf0 shipped H, Z and F with lane R's block).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const dir = new URL('../../../refactor/lanes-v2/', import.meta.url);
const lanes = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

test('each lane file names only its own lane in its specifics block and claim commit', () => {
  for (const lane of lanes) {
    const text = readFileSync(new URL(`${lane}.md`, dir), 'utf8');
    assert.deepEqual(text.match(/^LANE \S+ SPECIFICS/gm), [`LANE ${lane} SPECIFICS`], lane);
    const claims = new Set([...text.matchAll(/lane (\S+) v2 driver/g)].map((m) => m[1]));
    assert.deepEqual([...claims], [lane], lane);
  }
});
