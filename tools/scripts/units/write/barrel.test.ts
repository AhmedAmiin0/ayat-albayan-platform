import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BarrelUse } from './write.types.ts';
import { barrelText } from './barrel.ts';

const TEXTS: Record<string, string> = {
  'u/A.tsx': 'export const A = 1;\nexport class K {}\n',
  'u/A.types.ts': 'export interface AProps { a: 1 }\nexport type Mode = 1;\n',
};

const use = (style: BarrelUse['style']): BarrelUse => ({
  style,
  files: new Map([
    [
      'u/A.types.ts',
      new Map([
        ['Mode', false],
        ['AProps', false],
      ]),
    ],
    [
      'u/A.tsx',
      new Map([
        ['K', true],
        ['A', false],
      ]),
    ],
  ]),
});

test('barrelText re-exports exactly the imported names; types by declaration or by use', () => {
  assert.equal(
    barrelText(use('bare'), (f) => TEXTS[f] ?? ''),
    "export { A, type K } from './A';\nexport { type AProps, type Mode } from './A.types';\n",
  );
});

test("barrelText keeps the importers' extension style", () => {
  const text = barrelText(use('exact'), (f) => TEXTS[f] ?? '');
  assert.match(text, /from '\.\/A\.tsx';\nexport .* from '\.\/A\.types\.ts';\n$/);
  assert.match(
    barrelText(use('js'), (f) => TEXTS[f] ?? ''),
    /from '\.\/A\.js';/,
  );
});

test('a long line wraps like oxfmt', () => {
  const names = new Map(Array.from({ length: 12 }, (_, i) => [`someLongName${i}`, false] as const));
  const text = barrelText({ style: 'bare', files: new Map([['u/A.tsx', names]]) }, () => '');
  assert.match(text, /^export \{\n {2}someLongName0,\n/);
});
