import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCounts } from '../parse.mjs';

const dir = new URL('..', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.sql'));

test('files: every committed counts file is one the runner accepts', () => {
  assert.ok(files.length > 0);
  for (const name of files) {
    assert.doesNotThrow(() => parseCounts(readFileSync(new URL(name, dir), 'utf8')), name);
  }
});
