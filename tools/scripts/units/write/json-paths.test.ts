import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPathJson, renameJsonText } from './json-paths.ts';

const MOVES = [{ from: 'apps/w/src/p/A.tsx', to: 'apps/w/src/p/A/A.tsx' }];

test('isPathJson: the suppression baselines and the refactor guard lists', () => {
  const yes = [
    'apps/w/oxlint-suppressions.json',
    'oxlint-suppressions.json',
    'refactor/guards/knip.json',
  ];
  const no = ['refactor/folder-cap/web.json', 'apps/w/package.json', 'refactor/moves/a.json'];
  yes.forEach((f) => assert.equal(isPathJson(f), true, f));
  no.forEach((f) => assert.equal(isPathJson(f), false, f));
});

test('a suppression file renames its package-relative keys, counts untouched', () => {
  const text =
    '{\n  "src/p/A.tsx": {\n    "max-len": {\n      "count": 2\n    }\n  },\n  "src/p/A.tsxb": {}\n}';
  const out = renameJsonText('apps/w/oxlint-suppressions.json', text, MOVES);
  assert.equal(out, text.replace('"src/p/A.tsx"', '"src/p/A/A.tsx"'));
});

test('a guard list renames repo paths, also as the head of a knip entry', () => {
  const text = '[\n  "apps/w/src/p/A.tsx exports X",\n  "apps/w/src/p/A.tsx"\n]\n';
  assert.equal(
    renameJsonText('refactor/guards/knip.json', text, MOVES),
    '[\n  "apps/w/src/p/A/A.tsx exports X",\n  "apps/w/src/p/A/A.tsx"\n]\n',
  );
});

test('a move outside the package leaves its suppressions as they are', () => {
  const text = '{ "src/p/A.tsx": {} }';
  assert.equal(renameJsonText('apps/other/oxlint-suppressions.json', text, MOVES), text);
});
