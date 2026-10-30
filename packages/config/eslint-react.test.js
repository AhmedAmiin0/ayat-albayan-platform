import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { reactRestrictions } from './eslint-react.js';

const linter = new Linter({ cwd: '/pkg' });
// JSX through espree (no TypeScript syntax needed): the selectors only read the AST.
const jsx = { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } };
const lint = ({ react19, file, code }) => {
  const blocks = reactRestrictions({ files: ['src/**/*.tsx'], effects: ['src/**/*.tsx'], react19 });
  return linter.verify(code, [jsx, ...blocks], `/pkg/${file}`).map((m) => m.message.split(':')[0]);
};

const imports = "import React, { forwardRef, memo, useContext, useMemo } from 'react';";

test('React 18 (web): only the compiler rule, per import and per React.x', () => {
  const code = `${imports}\nexport const A = () => React.useCallback(() => 1, []);`;
  assert.deepEqual(lint({ react19: false, file: 'src/a.tsx', code }), Array(3).fill('React Compiler'));
});

test('React 19 (mobile): forwardRef, useContext and <X.Provider> too, a Provider counted once', () => {
  const code = `${imports}\nexport const A = () => <Ctx.Provider value={1}><b /></Ctx.Provider>;`;
  assert.deepEqual(lint({ react19: true, file: 'src/a.tsx', code }).sort(), [
    'React 19',
    'React 19',
    'React 19',
    'React Compiler',
    'React Compiler',
  ]);
});

test('a raw effect fails outside hook files; hook files keep the other rules', () => {
  const code = "import { useEffect, useMemo } from 'react';\nexport function useA() { useEffect(() => {}); React.useLayoutEffect(() => {}); }";
  assert.deepEqual(lint({ react19: true, file: 'src/a.tsx', code }), ['React Compiler', 'Effects', 'Effects']);
  for (const file of ['src/hooks/a.tsx', 'src/x/use-a.tsx']) {
    assert.deepEqual(lint({ react19: true, file, code }), ['React Compiler'], file);
  }
});
