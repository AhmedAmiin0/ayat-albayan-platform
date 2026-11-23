import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedFailure } from './barrel.mjs';

test('an added index.ts of re-exports only passes', () => {
  const text =
    "export { A, type B } from './A';\nexport * from './C';\nexport type { D } from './D';\n";
  assert.equal(addedFailure('p/A/index.ts', text), null);
  assert.equal(addedFailure('p/A/index.ts', 'export {};\n'), null);
});

test('an index.ts with any other statement, or any other added file, fails', () => {
  assert.match(addedFailure('p/A/index.ts', 'export const x = 1;\n') ?? '', /more than re-exports/);
  assert.match(
    addedFailure('p/A/index.ts', "import { a } from './a';\nexport { a };\n") ?? '',
    /more than/,
  );
  assert.match(addedFailure('p/A/new.ts', "export * from './a';\n") ?? '', /added/);
});
