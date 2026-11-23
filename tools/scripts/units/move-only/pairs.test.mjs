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

test('two deleted files with the same masked text each pair with their own add', () => {
  const texts = {
    'base:p/a/index.ts': "export * from './x';\n",
    'base:p/b/index.ts': "export * from './y';\n",
    'HEAD:p/a/A/index.ts': "export * from '../x';\n",
    'HEAD:p/b/B/index.ts': "export * from '../y';\n",
  };
  const entries = [
    { status: 'D', path: 'p/a/index.ts' },
    { status: 'D', path: 'p/b/index.ts' },
    { status: 'A', path: 'p/a/A/index.ts' },
    { status: 'A', path: 'p/b/B/index.ts' },
  ];
  const out = pairRenames(
    entries,
    (path) => texts[`base:${path}`] ?? '',
    (path) => texts[`HEAD:${path}`] ?? '',
  );
  assert.deepEqual(
    out.map((e) => e.status),
    ['R', 'R'],
  );
});
