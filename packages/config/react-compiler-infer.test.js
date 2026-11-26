// docs/63 §1: a component with no hook gets no use-name.ts, because the React Compiler in its
// default `infer` mode (vite.js and expo/babel.js pass no options) skips a `use*` function that
// calls no hook. This pins that behaviour for the compiler version the apps build with.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// @babel/core is the babel that @rolldown/plugin-babel runs for vite.js, resolved from there.
const babel = createRequire(createRequire(import.meta.url).resolve('@rolldown/plugin-babel'))(
  '@babel/core',
);

const compile = (code) =>
  babel.transformSync(code, {
    filename: '/w/src/Card/use-card.js',
    babelrc: false,
    configFile: false,
    plugins: [['babel-plugin-react-compiler', {}]],
  }).code;

test('infer mode skips a use* function that calls no hook', () => {
  const out = compile('export function useCard(a) {\n  return { n: a.x + 1, f: () => a.x };\n}\n');
  assert.doesNotMatch(out, /compiler-runtime/);
});

test('infer mode memoizes a use* function that calls a hook', () => {
  const code =
    "import { useState } from 'react';\nexport function useCard(a) {\n  const [s] = useState(a);\n  return { s, f: () => s };\n}\n";
  assert.match(compile(code), /compiler-runtime/);
});
