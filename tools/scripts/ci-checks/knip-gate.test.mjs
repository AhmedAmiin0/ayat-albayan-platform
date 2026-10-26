import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, flatten } from './knip-gate.mjs';

test('flatten lists one line per unused file, export, type, dependency and enum member', () => {
  const report = {
    files: ['src/dead.ts'],
    issues: [
      { file: 'src/a.ts', exports: [{ name: 'B', line: 1 }, { name: 'A', line: 2 }], types: [], enumMembers: { Color: [{ name: 'Red' }] } },
      { file: 'package.json', devDependencies: [{ name: 'left-pad' }], duplicates: [[{ name: 'x' }, { name: 'y' }]] },
    ],
  };
  assert.deepEqual(flatten(report), [
    'package.json devDependencies left-pad',
    'package.json duplicates x|y',
    'src/a.ts enumMembers Color.Red',
    'src/a.ts exports A',
    'src/a.ts exports B',
    'src/dead.ts files',
  ]);
});

test('compare: a new issue is added, a gone one is fixed', () => {
  assert.deepEqual(compare(['a', 'c'], ['a', 'b']), { added: ['c'], fixed: ['b'] });
  assert.deepEqual(compare(['a'], ['a']), { added: [], fixed: [] });
});
