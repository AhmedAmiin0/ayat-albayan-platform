// Base/head pairs around directive comments: any change to one fails, plain comments may go.
export const pass = [
  {
    name: 'a plain comment removed beside a kept directive',
    file: 'a.ts',
    base: '// eslint-disable-next-line no-console -- a CLI\nconsole.log(1); // print\n',
    head: '// eslint-disable-next-line no-console -- a CLI\nconsole.log(1);\n',
  },
];

export const fail = [
  {
    name: 'an eslint-disable removed',
    file: 'a.ts',
    base: '// eslint-disable-next-line no-console -- a CLI\nconsole.log(1);\n',
    head: 'console.log(1);\n',
  },
  {
    name: 'an eslint-disable reason edited',
    file: 'a.ts',
    base: '/* eslint-disable max-lines -- generated */\nf();\n',
    head: '/* eslint-disable max-lines -- long */\nf();\n',
  },
  {
    name: 'a @ts-expect-error removed',
    file: 'a.ts',
    base: '// @ts-expect-error the lib type is wrong\nf(1);\n',
    head: 'f(1);\n',
  },
  {
    name: 'a @deprecated JSDoc removed',
    file: 'a.ts',
    base: '/** @deprecated use g */\nexport function f() {}\n',
    head: 'export function f() {}\n',
  },
  {
    name: 'a /// <reference removed',
    file: 'env.d.ts',
    base: '/// <reference types="vite/client" />\nexport {};\n',
    head: 'export {};\n',
  },
  {
    name: 'an oxlint-disable removed',
    file: 'a.ts',
    base: 'f(); // oxlint-disable-line no-x\n',
    head: 'f();\n',
  },
  {
    name: 'a webpackChunkName removed',
    file: 'a.ts',
    base: "void import(/* webpackChunkName: 'a' */ './a');\n",
    head: "void import('./a');\n",
  },
  {
    name: 'a JSX eslint-disable removed',
    file: 'A.tsx',
    base: 'const a = (\n  <p>\n    {/* eslint-disable-next-line x */}\n    <b />\n  </p>\n);\n',
    head: 'const a = (\n  <p>\n    <b />\n  </p>\n);\n',
  },
  {
    name: 'a Stryker disable removed',
    file: 'a.ts',
    base: '// Stryker disable next-line all: a log line\nlog();\n',
    head: 'log();\n',
  },
  {
    name: 'a falls through removed',
    file: 'a.ts',
    base: 'switch (x) {\n  case 1:\n    f();\n  // falls through\n  case 2:\n    g();\n}\n',
    head: 'switch (x) {\n  case 1:\n    f();\n  case 2:\n    g();\n}\n',
  },
  {
    name: 'a JSDoc @type removed in a checked JS file',
    file: 'a.mjs',
    base: '// @ts-check\n/** @type {number} */\nlet n;\n',
    head: '// @ts-check\nlet n;\n',
  },
];
