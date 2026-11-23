// Base/head pairs for the shape check: `pass` differ only in comments, `fail` in code.
export const pass = [
  {
    name: 'line, block and JSDoc comments removed',
    file: 'a.ts',
    base: [
      '/** Adds. */',
      'export function add(a: number, b: number): number {',
      '  // sum',
      '  return a /* left */ + b; // done',
      '}',
      '/* trailing */',
    ].join('\n'),
    head: 'export function add(a: number, b: number): number {\n  return a + b;\n}\n',
  },
  {
    name: 'a comment edited',
    file: 'b.mjs',
    base: 'const x = 1; // old words\n',
    head: 'const x = 1; // new words\n',
  },
  {
    name: 'a comment removed from a typed .mts file',
    file: 'vitest.config.mts',
    base: 'const n: number = 1; // why\nexport default <T,>(x: T) => n;\n',
    head: 'const n: number = 1;\nexport default <T,>(x: T) => n;\n',
  },
  {
    name: 'a comment removed from JSX in a .jsx file',
    file: 'A.jsx',
    base: 'const a = <p>{/* x */}hi</p>;\n',
    head: 'const a = <p>hi</p>;\n',
  },
];

export const fail = [
  {
    name: 'an identifier renamed',
    file: 'a.ts',
    base: 'const total = 1; // n\nexport { total };\n',
    head: 'const sum = 1;\nexport { sum };\n',
  },
  {
    name: 'a type changed in a .cts file',
    file: 'a.cts',
    base: 'export const n: number = 1;\n',
    head: 'export const n: string = 1;\n',
  },
  {
    name: 'a number literal changed',
    file: 'a.ts',
    base: 'const x = 1;\n',
    head: 'const x = 2;\n',
  },
  { name: 'a string literal changed', file: 'a.js', base: "f('a');\n", head: "f('b');\n" },
  {
    name: 'two statements reordered',
    file: 'a.ts',
    base: 'a(); // one\nb(); // two\n',
    head: 'b();\na();\n',
  },
  {
    name: 'a // inside a string changed',
    file: 'a.ts',
    base: "const u = 'https://x.test/a';\n",
    head: "const u = 'https:';\n",
  },
  {
    name: 'a /* inside a template literal changed',
    file: 'a.ts',
    base: 'const t = `a /* b */ ${x} c // d`;\n',
    head: 'const t = `a  ${x} c `;\n',
  },
  {
    name: 'a // inside a regex changed',
    file: 'a.mjs',
    base: 'const r = /\\/\\/ x/;\n',
    head: 'const r = /\\/ x/;\n',
  },
  {
    name: 'a comment with a newline that changes ASI',
    file: 'a.ts',
    base: 'function f() {\n  return /*\n*/ x;\n}\n',
    head: 'function f() {\n  return x;\n}\n',
  },
  {
    name: 'the shebang changed',
    file: 'a.mjs',
    base: '#!/usr/bin/env node\nrun();\n',
    head: '#!/usr/bin/env node --test\nrun();\n',
  },
];
