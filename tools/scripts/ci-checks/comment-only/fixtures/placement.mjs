// Base/head pairs where a directive moves or the head no longer parses: the code tokens match, so
// only the directive's place or the parse result tells them apart.
export const pass = [
  {
    name: 'a JSX comment removed before a kept directive',
    file: 'A.tsx',
    base: 'const a = (\n  <p>\n    {/* note */}\n    <b />\n  </p>\n);\n// @ts-expect-error x\nf();\n',
    head: 'const a = (\n  <p>\n    <b />\n  </p>\n);\n// @ts-expect-error x\nf();\n',
  },
  {
    name: 'a plain comment removed before a kept directive',
    file: 'a.ts',
    base: 'g(); // note\n// eslint-disable-next-line no-console\nconsole.log(1);\n',
    head: 'g();\n// eslint-disable-next-line no-console\nconsole.log(1);\n',
  },
];

export const fail = [
  {
    name: 'an eslint-disable-next-line moved to another call',
    file: 'a.ts',
    base: '// eslint-disable-next-line no-console\nconsole.log(1);\nconsole.log(2);\n',
    head: 'console.log(1);\n// eslint-disable-next-line no-console\nconsole.log(2);\n',
  },
  {
    name: 'a @ts-expect-error moved to the next declaration',
    file: 'a.ts',
    base: '// @ts-expect-error x\nconst a: string = 1;\nconst b: string = 2;\n',
    head: 'const a: string = 1;\n// @ts-expect-error x\nconst b: string = 2;\n',
  },
  {
    name: 'a #__PURE__ moved to another call',
    file: 'a.mjs',
    base: 'export const a = /*#__PURE__*/ f();\nexport const b = g();\n',
    head: 'export const a = f();\nexport const b = /*#__PURE__*/ g();\n',
  },
  {
    name: 'a merge conflict left in the head',
    file: 'a.mjs',
    base: 'const a = 1;\n',
    head: 'const a = 1;\n<<<<<<< HEAD\n=======\nconst a = 2;\n>>>>>>> other\n',
  },
  {
    name: 'an unterminated block comment in the head',
    file: 'a.mjs',
    base: 'const a = 1;\n',
    head: 'const a = 1;\n/* unterminated\n',
  },
];
