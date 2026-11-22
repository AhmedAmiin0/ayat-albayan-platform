// Base/head pairs for the shape check: `pass` differ only in comments, `fail` in code. In JSX a
// `{/* … */}` child and layout whitespace may change, elements and text not.
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
];

export const fail = [
  {
    name: 'an identifier renamed',
    file: 'a.ts',
    base: 'const total = 1; // n\nexport { total };\n',
    head: 'const sum = 1;\nexport { sum };\n',
  },
  { name: 'a number literal changed', file: 'a.ts', base: 'const x = 1;\n', head: 'const x = 2;\n' },
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

export const jsxPass = [
  {
    name: 'a JSX comment child removed',
    file: 'A.tsx',
    base: [
      'export const A = () => (',
      '  <div>',
      '    {/* the title */}',
      '    <h1>Hi</h1>',
      '    {/* x */}',
      '  </div>',
      ');',
    ].join('\n'),
    head: 'export const A = () => (\n  <div>\n    <h1>Hi</h1>\n  </div>\n);\n',
  },
  {
    name: 'a JSX comment removed between words',
    file: 'A.tsx',
    base: 'const a = <p>one {/* x */} two</p>;\n',
    head: 'const a = <p>one two</p>;\n',
  },
  {
    name: 'a comment inside a JSX attribute expression removed',
    file: 'A.tsx',
    base: 'const a = <p title={t /* why */}>x</p>;\n',
    head: 'const a = <p title={t}>x</p>;\n',
  },
];

export const jsxFail = [
  {
    name: 'a JSX child element removed',
    file: 'A.tsx',
    base: 'const a = (\n  <div>\n    <h1>Hi</h1>\n    <p>x</p>\n  </div>\n);\n',
    head: 'const a = (\n  <div>\n    <h1>Hi</h1>\n  </div>\n);\n',
  },
  {
    name: 'a // inside JSX text changed',
    file: 'A.tsx',
    base: 'const a = <p>see // here</p>;\n',
    head: 'const a = <p>see</p>;\n',
  },
  {
    name: 'a /* inside JSX text changed',
    file: 'A.tsx',
    base: 'const a = <p>a /* b */ c</p>;\n',
    head: 'const a = <p>a c</p>;\n',
  },
];
