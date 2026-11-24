import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapesOf, inScope } from '../escapes.mjs';

const each = [
  '// eslint-disable-next-line no-console',
  '/* eslint-disable max-lines */',
  '// oxlint-disable-next-line no-control-regex -- why',
  '/* oxlint-disable */',
  '// @ts-expect-error a Date is not JSON',
  '// @ts-ignore',
  '// @ts-nocheck',
  '/* istanbul ignore next */',
  '/* c8 ignore start */',
  '/* v8 ignore next */',
  '// Stryker disable next-line all',
  '// jscpd:ignore-start',
  '// biome-ignore lint/style: why',
];

test('escapesOf: every disable, ignore and @ts- escape comment form', () => {
  const text = each.map((comment) => `${comment}\nf();`).join('\n');
  assert.deepEqual(
    escapesOf(text, 'a.ts').map((e) => e.comment),
    each,
  );
});

test('escapesOf: the line of each one, in JSX too', () => {
  const text = 'const a = (\n  <p>\n    {/* eslint-disable-next-line x */}\n    <b />\n  </p>\n);\n';
  assert.deepEqual(escapesOf(text, 'a.tsx'), [{ line: 3, comment: '/* eslint-disable-next-line x */' }]);
});

test('escapesOf: strings, templates and prose that names a directive are no escape', () => {
  const text = [
    "const a = '// eslint-disable-next-line no-console';",
    'const b = `/* @ts-expect-error */`;',
    '// Inline eslint-disable comments are banned (docs/59).',
    '/** A @ts-expect-error test becomes expectTypeOf(...).not. */',
    'f();',
  ].join('\n');
  assert.deepEqual(escapesOf(text, 'a.ts'), []);
});

test('inScope: code in the linted folders, generated files left out', () => {
  const paths = [
    'apps/api/src/a.ts',
    'packages/core/src/b.tsx',
    'tools/scripts/c.mjs',
    'e2e/d.spec.ts',
    'docs/design/brand/tools/e.mjs',
    'docs/design/f.mjs',
    'apps/staff-web/src/routeTree.gen.ts',
    'packages/db/src/types.ts',
    'apps/api/README.md',
  ];
  assert.deepEqual(paths.filter(inScope), paths.slice(0, 5));
});
