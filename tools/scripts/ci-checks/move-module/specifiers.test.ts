import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdits, specifierNodes } from './specifiers.ts';
import { newProject } from './rewrite.ts';

const SOURCE = `import a from './a';
import type { B } from "../b";
import './side';
export { c } from './c';
export * from './d';
const e = await import('./e');
type F = import('./f').F;
vi.mock('./g', () => ({}));
jest.mock(\`./h\`);
const i = vi.importActual<typeof import('./i')>('./i2');
const j = require('./j');
import k = require('./k');
someCall('./not-a-path');
const s = 'also-not';
`;

test('finds every module path and nothing else', () => {
  const sf = newProject().createSourceFile('/v/x.ts', SOURCE);
  const values = specifierNodes(sf).map((s) => s.value).sort();
  assert.deepEqual(values, ['../b', './a', './c', './d', './e', './f', './g', './h', './i', './i2', './j', './k', './side']);
});

test('spans exclude the quotes and edits keep them', () => {
  const sf = newProject().createSourceFile('/v/y.ts', `import a from "./a";\nvi.mock('./g');\n`);
  const edits = specifierNodes(sf).map((s) => ({ ...s, value: `${s.value}/moved` }));
  assert.equal(applyEdits(sf.getFullText(), edits), `import a from "./a/moved";\nvi.mock('./g/moved');\n`);
});
