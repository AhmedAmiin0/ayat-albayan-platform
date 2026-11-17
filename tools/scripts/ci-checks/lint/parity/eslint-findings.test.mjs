import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import format, { FINDINGS, findingsReport } from './eslint-findings.mjs';
import { compareFindings } from './compare.mjs';
import { findingsOf } from './eslint-run.mjs';

const message = (ruleId, line, kind) => ({
  ruleId,
  line,
  column: 1,
  severity: 2,
  message: 'm',
  ...(kind ? { suppressions: [{ kind, justification: '' }] } : {}),
});

const result = (root) => ({
  filePath: join(root, 'a.ts'),
  messages: [message('max-lines', 1)],
  suppressedMessages: [message('complexity', 7, 'file'), message('max-depth', 9, 'directive')],
  errorCount: 1,
  warningCount: 0,
  fatalErrorCount: 0,
  fixableErrorCount: 0,
  fixableWarningCount: 0,
});

test('findingsReport: messages plus bulk-suppressed (kind file) findings, never eslint-disable ones', () => {
  const [file] = findingsReport([result('/r')]);
  assert.deepEqual(file.messages, [
    { ruleId: 'max-lines', line: 1 },
    { ruleId: 'complexity', line: 7 },
  ]);
});

test('a finding hidden by eslint-suppressions.json that Oxlint lacks still counts as missing', () => {
  const root = '/r';
  const eslint = findingsOf(root, findingsReport([result(root)]));
  const oxlint = [{ file: 'a.ts', line: 1, rule: 'max-lines' }];
  const { missing } = compareFindings(eslint, oxlint);
  assert.deepEqual(missing, [{ file: 'a.ts', line: 7, rule: 'complexity' }]);
});

test('the formatter saves the findings in the package and prints stylish text', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'eslint-findings-'));
  const text = await format([result(cwd)], { cwd, rulesMeta: {} });
  assert.match(text, /max-lines/);
  assert.doesNotMatch(text, /complexity/, 'a suppressed finding stays out of the log');
  const saved = JSON.parse(readFileSync(join(cwd, FINDINGS), 'utf8'));
  assert.deepEqual(saved, findingsReport([result(cwd)]));
});
