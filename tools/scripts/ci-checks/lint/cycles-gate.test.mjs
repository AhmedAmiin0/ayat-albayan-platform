import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, cycleEdges, cycles, folderGraph, specsOf } from './cycles-gate.mjs';

const file = (path, ...specs) => ({ path, text: specs.map((s) => `import { x } from '${s}';\n`).join('') });

test('specsOf finds relative imports, re-exports and dynamic imports, not packages', () => {
  const text = "import a from './a.js';\nexport * from '../b/index.js';\nconst c = await import('./c.js');\nimport z from 'zod';\n";
  assert.deepEqual(specsOf(text), ['./a.js', '../b/index.js', './c.js']);
});

test('specsOf reads multi-line and side-effect imports, not paths named in comments', () => {
  const text = "import {\n  a,\n  b,\n} from '../a/index.js';\nimport '../b/side.js';\n// moved from '../c/x.js'\n/* see '../d/y.js' */\n";
  assert.deepEqual(specsOf(text), ['../a/index.js', '../b/side.js']);
});

test('folderGraph links top folders only, ignoring same-folder and root files', () => {
  const graph = folderGraph([
    file('a/x.ts', './y.js', '../b/index.js', '../../outside.js'),
    file('b/deep/z.ts', '../../c/index.js'),
    file('index.ts', './a/x.js'),
  ]);
  assert.deepEqual([...graph].map(([k, v]) => [k, [...v]]), [['a', ['b']], ['b', ['c']]]);
});

test('cycles and their edges: a 3-folder loop counts its 3 edges, a tail into it counts none', () => {
  const graph = folderGraph([
    file('a/x.ts', '../b/index.js'),
    file('b/x.ts', '../c/index.js'),
    file('c/x.ts', '../a/index.js'),
    file('d/x.ts', '../a/index.js'),
  ]);
  assert.deepEqual(cycles(graph), [['a', 'b', 'c']]);
  assert.deepEqual(cycleEdges(graph), ['a → b', 'b → c', 'c → a']);
});

test('an acyclic tree has no cycle edges', () => {
  const graph = folderGraph([file('a/x.ts', '../core/index.js'), file('b/x.ts', '../core/index.js', '../a/index.js')]);
  assert.deepEqual(cycleEdges(graph), []);
});

test('check: above the base branch is a new cycle; equal or below passes with nothing to edit', () => {
  assert.deepEqual(check({ r: 3 }, { r: 3 }), []);
  assert.deepEqual(check({ r: 4 }, { r: 3 }), ["r: 4 cycle edges > the base branch's 3"]);
  assert.deepEqual(check({ r: 2 }, { r: 3 }), []);
  // A root the base lacks (this PR adds it): its first count is the baseline.
  assert.deepEqual(check({ r: 1 }, {}), []);
});
