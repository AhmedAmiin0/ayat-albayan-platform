import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dateRestrictions } from './eslint-dates.js';
import { lintCode, withCode } from './oxlint/testing/lint-code.js';

const blocks = [
  { files: ['**/*.js'], rules: { 'no-restricted-properties': ['error', ...dateRestrictions] } },
  { files: ['**/*.test.js', 'src/time/**'], rules: { 'no-restricted-properties': 'off' } },
];
const code = [
  "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' });",
  "d.toLocaleDateString('en-CA');",
  'd.toLocaleTimeString();',
  'd.getTimezoneOffset();',
  "n.toLocaleString('en-US'); Intl.NumberFormat; d.toISOString();",
].join('\n');
const files = ['src/features/a.js', 'src/time/format.js', 'src/features/a.test.js'];
const found = lintCode({ blocks, files: withCode(files, code) });
const lint = (file) =>
  found.filter((d) => d.file === file).map((d) => /^'([^']+)' is restricted/.exec(d.message)?.[1]);

test('the four hand-rolled date APIs fail in app code; numbers and ISO strings do not', () => {
  const names = ['Intl.DateTimeFormat', 'toLocaleDateString', 'toLocaleTimeString', 'getTimezoneOffset'];
  assert.deepEqual(lint('src/features/a.js'), names);
});

test('the facade (src/time) and tests may use them', () => {
  assert.deepEqual(lint('src/time/format.js'), []);
  assert.deepEqual(lint('src/features/a.test.js'), []);
});
