import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Linter } from 'eslint';
import { dateRestrictions } from './eslint-dates.js';

const linter = new Linter({ cwd: '/pkg' });
const blocks = [
  { files: ['**/*.js'], rules: { 'no-restricted-properties': ['error', ...dateRestrictions] } },
  { files: ['**/*.test.js', 'src/time/**'], rules: { 'no-restricted-properties': 'off' } },
];
const lint = (file, code) =>
  linter.verify(code, blocks, `/pkg/${file}`).map((m) => /is restricted from being used\. (\S+):/.exec(m.message)?.[1]);

const code = [
  "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' });",
  "d.toLocaleDateString('en-CA');",
  'd.toLocaleTimeString();',
  'd.getTimezoneOffset();',
  "n.toLocaleString('en-US'); Intl.NumberFormat; d.toISOString();",
].join('\n');

test('the four hand-rolled date APIs fail in app code; numbers and ISO strings do not', () => {
  const found = ['Intl.DateTimeFormat', 'toLocaleDateString', 'toLocaleTimeString', 'getTimezoneOffset'];
  assert.deepEqual(lint('src/features/a.js', code), found);
});

test('the facade (src/time) and tests may use them', () => {
  assert.deepEqual(lint('src/time/format.js', code), []);
  assert.deepEqual(lint('src/features/a.test.js', code), []);
});
