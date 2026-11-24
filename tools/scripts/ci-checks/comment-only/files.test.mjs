import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileFailures, parseNameStatus } from './files.mjs';

const entries = (out) => parseNameStatus(out);

test('parses name-status lines, renames with both paths', () => {
  assert.deepEqual(entries('M\ta.ts\nR100\tb.ts\tc.ts\n'), [
    { status: 'M', path: 'a.ts' },
    { status: 'R100', path: 'c.ts', from: 'b.ts' },
  ]);
});

test('.mts, .cts and .jsx files count as code', () => {
  assert.deepEqual(fileFailures(entries('M\tvitest.config.mts\nM\ta.cts\nM\tB.jsx\n')), []);
});

test('a modified code file or suppressions file passes', () => {
  const out = 'M\ta.ts\nM\tB.tsx\nM\tc.js\nM\td.mjs\nM\te.cjs\nM\tx/oxlint-suppressions.json\n';
  assert.deepEqual(fileFailures(entries(`${out}M\tx/oxlint-suppressions.json\n`)), []);
});

const failing = {
  'an added file': 'A\tnew.ts',
  'a deleted file': 'D\told.ts',
  'a renamed file': 'R100\ta.ts\tb.ts',
  'a copied file': 'C90\ta.ts\tb.ts',
  'a type change': 'T\ta.ts',
  'a JSON change': 'M\tpackage.json',
  'a YAML change': 'M\t.github/workflows/ci.yml',
  'a Markdown change': 'M\tCLAUDE.md',
  'a migration edit': 'M\tpackages/db/supabase/migrations/0001_init.sql',
  'a migration script edit': 'M\tpackages/db/supabase/migrations/x.ts',
  'the generated db types': 'M\tpackages/db/src/types.ts',
  'a generated file': 'M\tapps/staff-web/src/routeTree.gen.ts',
  'a built file': 'M\tpackages/core/dist/index.js',
};

for (const [name, line] of Object.entries(failing)) {
  test(`${name} fails`, () => {
    const found = fileFailures(entries(`${line}\n`));
    assert.equal(found.length, 1);
    assert.match(found[0], /\S/);
  });
}

test('a malformed name-status line throws', () => {
  assert.throws(() => entries('weird line\n'));
});
