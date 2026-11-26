import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reactRestrictions } from './eslint-react.js';
import { lintCode } from './oxlint/testing/lint-code.js';

const lint = ({ compiler, react19, file, code }) => {
  const blocks = reactRestrictions({
    files: ['src/**/*.tsx'],
    effects: ['src/**/*.tsx'],
    compiler,
    react19,
  });
  return lintCode({ blocks, files: { [file]: code } }).map((d) => d.message.split(':')[0]);
};

const imports = "import React, { forwardRef, memo, useContext, useMemo } from 'react';";
const provider = `${imports}\nexport const A = () => <Ctx.Provider value={1}><b /></Ctx.Provider>;`;

test('compiled, React 19 rules off (web): only the no-memo rule, per import and per React.x', () => {
  const code = `${imports}\nexport const A = () => React.useCallback(() => 1, []);`;
  assert.deepEqual(
    lint({ compiler: true, react19: false, file: 'src/a.tsx', code }),
    Array(3).fill('React Compiler'),
  );
  assert.deepEqual(lint({ compiler: false, react19: false, file: 'src/a.tsx', code }), []);
});

test('React 19 (mobile): forwardRef, useContext and <X.Provider>, a Provider counted once; memo only when compiled', () => {
  assert.deepEqual(
    lint({ compiler: false, react19: true, file: 'src/a.tsx', code: provider }),
    Array(3).fill('React 19'),
  );
  const both = lint({ compiler: true, react19: true, file: 'src/a.tsx', code: provider }).sort();
  assert.deepEqual(both, [...Array(3).fill('React 19'), ...Array(2).fill('React Compiler')]);
});

test('a raw effect fails outside hook files; hook files keep the other rules', () => {
  const code =
    "import { useEffect, useMemo } from 'react';\nexport function useA() { useEffect(() => {}); React.useLayoutEffect(() => {}); }";
  const on = { compiler: true, react19: true, code };
  assert.deepEqual(lint({ ...on, file: 'src/a.tsx' }), ['React Compiler', 'Effects', 'Effects']);
  for (const file of ['src/hooks/a.tsx', 'src/x/use-a.tsx']) {
    assert.deepEqual(lint({ ...on, file }), ['React Compiler'], file);
  }
  assert.deepEqual(lint({ ...on, compiler: false, file: 'src/a.tsx' }), ['Effects', 'Effects']);
});

test("a component's local hook (src/**/Name/use-*.ts) refuses a raw effect; shared hooks do not", () => {
  const code =
    "import { useEffect } from 'react';\nexport function useA() { useEffect(() => {}); }";
  const on = { compiler: true, react19: false, code };
  assert.deepEqual(lint({ ...on, file: 'src/x/Card/use-card.ts' }), ['Effects']);
  assert.deepEqual(lint({ ...on, file: 'src/x/use-card.ts' }), []);
  assert.deepEqual(lint({ ...on, file: 'src/x/card/use-card.ts' }), []);
});
