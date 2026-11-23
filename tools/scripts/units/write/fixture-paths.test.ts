import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdits } from '../../ci-checks/move-module/specifiers.ts';
import { newProject } from '../../ci-checks/move-module/rewrite.ts';
import { fixtureEdits } from './fixture-paths.ts';

const run = (text: string, ctx: Omit<Parameters<typeof fixtureEdits>[1], 'sf'>): string => {
  const sf = newProject().createSourceFile('/v/x.ts', text);
  return applyEdits(text, fixtureEdits(sf, ctx));
};

const MOVED = {
  file: 'p/A.x.test.ts',
  to: 'p/A/tests/x.test.ts',
  renamed: new Map<string, string>(),
};

test('a moved file keeps reading the same fixtures', () => {
  const src = [
    "new URL('./fixtures/a.json', import.meta.url);",
    "new URL('data.txt', import.meta.url);",
    "join(import.meta.dirname, 'fixtures', 'b.json');",
    "path.resolve(__dirname, 'c.json');",
    "join(root, 'untouched.json');",
  ].join('\n');
  assert.equal(
    run(src, MOVED),
    [
      "new URL('../../fixtures/a.json', import.meta.url);",
      "new URL('../../data.txt', import.meta.url);",
      "join(import.meta.dirname, '../../fixtures', 'b.json');",
      "path.resolve(__dirname, '../../c.json');",
      "join(root, 'untouched.json');",
    ].join('\n'),
  );
});

test('a path to a moved file follows it, moved reader or not', () => {
  const renamed = new Map([['p/A.tsx', 'p/A/A.tsx']]);
  const src = "readFileSync(new URL('./A.tsx', import.meta.url));";
  assert.equal(
    run(src, { ...MOVED, renamed }),
    "readFileSync(new URL('../A.tsx', import.meta.url));",
  );
  const still = { file: 'p/b.test.ts', to: 'p/b.test.ts', renamed };
  assert.equal(run(src, still), "readFileSync(new URL('./A/A.tsx', import.meta.url));");
});

test('a file that stays and reads no moved path is left as it is', () => {
  const src = "new URL('./fixtures/a.json', import.meta.url);";
  assert.equal(run(src, { file: 'p/b.ts', to: 'p/b.ts', renamed: new Map() }), src);
});

test('several literals to a moved file become one literal to its new place', () => {
  const renamed = new Map([['b/Unit.ts', 'b/Unit/Unit.ts']]);
  const src = "join(__dirname, '..', 'b', 'Unit.ts');";
  const still = { file: 'a/r.ts', to: 'a/r.ts', renamed };
  assert.equal(run(src, still), "join(__dirname, '../b/Unit/Unit.ts');");
});

test('a folder URL keeps its trailing slash', () => {
  const src = "new URL('./fixtures/', import.meta.url);";
  assert.equal(run(src, MOVED), "new URL('../../fixtures/', import.meta.url);");
});
