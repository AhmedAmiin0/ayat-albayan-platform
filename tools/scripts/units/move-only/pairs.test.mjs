import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pairRenames } from './pairs.mjs';

const TEXTS = {
  'base:p/A.tsx': "import { b } from './b';\nexport const A = b;\n",
  'HEAD:p/A/A.tsx': "import { b } from '@/p/b';\nexport const A = b;\n",
  'base:p/B.tsx': 'export const B = 1;\n',
  'HEAD:p/C.tsx': 'export const C = 1;\n',
};

test('a deleted and an added file with the same code but their paths pair as a rename', () => {
  const entries = [
    { status: 'D', path: 'p/A.tsx' },
    { status: 'A', path: 'p/A/A.tsx' },
    { status: 'D', path: 'p/B.tsx' },
    { status: 'A', path: 'p/C.tsx' },
    { status: 'M', path: 'x.json' },
  ];
  const read = (rev, path) => TEXTS[`${rev}:${path}`] ?? '';
  assert.deepEqual(
    pairRenames(
      entries,
      (path) => read('base', path),
      (path) => read('HEAD', path),
    ),
    [
      { status: 'D', path: 'p/B.tsx' },
      { status: 'A', path: 'p/C.tsx' },
      { status: 'M', path: 'x.json' },
      { status: 'R', path: 'p/A/A.tsx', from: 'p/A.tsx' },
    ],
  );
});
