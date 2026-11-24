import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commentsOf, directivesOf } from './comments.mjs';

test('collects line, block and JSDoc comments once each', () => {
  const text = '/** doc */\nfunction f(/* p */ a) {\n  return a; // end\n}\n// eof\n';
  assert.deepEqual(commentsOf(text, 'a.js'), ['/** doc */', '/* p */', '// end', '// eof']);
});

test('collects a comment inside an empty JSX expression', () => {
  assert.deepEqual(commentsOf('const a = <p>{/* x */}</p>;\n', 'A.tsx'), ['/* x */']);
});

const notComments = {
  string: ["const a = '// x /* y */';\n", 'a.ts'],
  template: ['const a = `// x ${b /* c */} /* y */`;\n', 'a.ts'],
  regex: ['const r = /\\/\\/ x/;\n', 'a.js'],
  jsxText: ['const a = <p>see // here /* and */ there</p>;\n', 'A.tsx'],
  jsxAttribute: ['const a = <a href="https://x.test/a">x</a>;\n', 'A.tsx'],
};

for (const [kind, [text, file]] of Object.entries(notComments)) {
  test(`reads no comment out of a ${kind}`, () => {
    const found = commentsOf(text, file).filter((c) => c !== '/* c */');
    assert.deepEqual(found, []);
  });
}

test('keeps only the directive comments', () => {
  const text = [
    '/// <reference types="node" />',
    '// plain',
    '/* eslint-disable max-lines */',
    '// @ts-expect-error why',
    '/** @deprecated use g */',
    '/* istanbul ignore next */',
    '// oxfmt-ignore',
    '/** @public */',
    'f();',
  ].join('\n');
  const found = directivesOf(text, 'a.ts');
  assert.equal(found.length, 7);
  assert.ok(!found.includes('// plain'));
});

const directives = [
  '/* #__PURE__ */',
  '/* @__PURE__ */',
  '/* @__NO_SIDE_EFFECTS__ */',
  '/* global window */',
  '/* exported main */',
  '/** @beta */',
  '/** @alpha */',
  '//# sourceMappingURL=a.js.map',
  '/*! keep me */',
  '/** @license MIT */',
  '/** @preserve */',
];

for (const comment of directives) {
  test(`${comment} is a directive`, () => {
    assert.deepEqual(directivesOf(`${comment}\nf();\n`, 'a.ts'), [comment]);
  });
}

test('a JSDoc that only describes is not a directive', () => {
  assert.deepEqual(directivesOf('/** Adds two numbers. */\nf();\n', 'a.ts'), []);
});
