import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check } from './run.mjs';

const AR = 'حلقة';

function run(files) {
  const lines = [];
  const read = (path) => files[path];
  const code = check({ paths: Object.keys(files), read, log: (l) => lines.push(l) });
  return { code, lines };
}

test('passes when no comment holds Arabic', () => {
  const { code, lines } = run({ 'apps/a.ts': `const a = '${AR}'; // ok\n` });
  assert.equal(code, 0);
  assert.match(lines.at(-1), /no Arabic in comments/);
});

test('fails with path and line for each hit, out-of-scope files skipped', () => {
  const { code, lines } = run({
    'apps/a.ts': `\n// ${AR}\n`,
    '.github/workflows/ci.yml': `on: push # ${AR}\n`,
    'packages/db/src/types.ts': `// ${AR}\n`,
    'docs/a.md': `<!-- ${AR} -->\n`,
  });
  assert.equal(code, 1);
  assert.deepEqual(lines.slice(0, 2), [
    'guard:comment-language: apps/a.ts:2: Arabic in a comment',
    'guard:comment-language: .github/workflows/ci.yml:1: Arabic in a comment',
  ]);
  assert.match(lines.at(-1), /2 comments with Arabic/);
});
