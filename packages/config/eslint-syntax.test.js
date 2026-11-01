import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { boundariesPlugin } from './eslint-boundaries.js';
import { syntaxBlocks, syntaxExempt } from './eslint-syntax.js';

const linter = new Linter({ cwd: '/pkg' });
const base = {
  files: ['**/*.ts'],
  languageOptions: { parser: tseslint.parser, globals: { fetch: 'readonly' } },
  plugins: { ab: boundariesPlugin },
};
const lint = (code, file = 'src/a.ts', extra = []) =>
  linter.verify(code, [base, ...syntaxBlocks(['**/*.test.*']), ...extra], `/pkg/${file}`)
    .map((m) => m.ruleId);

test('H-1: fetch and globalThis.fetch; a local named fetch is fine', () => {
  assert.deepEqual(lint('await fetch(u);'), ['no-restricted-globals']);
  assert.deepEqual(lint('await globalThis.fetch(u);'), ['ab/no-global-fetch']);
  assert.deepEqual(lint('const fetch = (u: string) => u;\nfetch(u);'), []);
});

test('H-2: `(await res.json()) as T` only', () => {
  assert.deepEqual(lint('const a = (await res.json()) as A;'), ['ab/no-unchecked-json']);
  assert.deepEqual(lint('const a = schema.parse(await res.json());'), []);
});

test('Z-2: in, typeof object, JSON.parse and a type guard on unknown', () => {
  const code = [
    "if ('a' in x) {}",
    "if (typeof x === 'object') {}",
    'JSON.parse(s);',
    'function isA(x: unknown): x is A { return true; }',
  ].join('\n');
  assert.deepEqual(lint(code), Array(4).fill('ab/no-shape-checks'));
  const fine = "if (typeof x === 'string') {}\nfunction isA(x: B): x is A { return true; }\nfor (const k in o) {}";
  assert.deepEqual(lint(fine), []);
});

test('Z-5: apiFetch / apiSend with a type argument, bare or client.', () => {
  const code = "apiFetch<A>('/a');\nclient.apiSend<A>('POST', '/a');\napiFetch('/a', { schema });";
  assert.deepEqual(lint(code), Array(2).fill('ab/no-untyped-api-calls'));
});

test('F-1: an else-if chain of 3+, not of 2', () => {
  assert.deepEqual(lint('if (a) {} else if (b) {} else if (c) {}'), ['ab/no-if-chains']);
  assert.deepEqual(lint('if (a) {} else if (b) {} else {}'), []);
});

test('tests and syntaxExempt turn off only their groups', () => {
  const code = "await fetch(u);\nJSON.parse(s);\nif (a) {} else if (b) {} else if (c) {}";
  assert.deepEqual(lint(code, 'src/a.test.ts'), ['ab/no-if-chains']);
  const http = [syntaxExempt({ files: ['src/http/**'], http: true })];
  assert.deepEqual(lint(code, 'src/http/a.ts', http), ['ab/no-shape-checks', 'ab/no-if-chains']);
  const shapes = [syntaxExempt({ files: ['src/q.ts'], shapes: true })];
  assert.deepEqual(lint(code, 'src/q.ts', shapes), ['no-restricted-globals', 'ab/no-if-chains']);
});
