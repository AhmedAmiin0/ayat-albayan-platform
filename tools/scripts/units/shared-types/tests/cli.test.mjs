import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runCli } from '../cli.mjs';
import { FILES } from './fixtures.mjs';

const io = () => {
  const out = [];
  return { out, log: (l) => out.push(l), readFiles: () => FILES };
};

test('without flags it prints the summary', () => {
  const { out, log, readFiles } = io();
  assert.equal(runCli([], { log, readFiles }), 0);
  assert.match(out.join('\n'), /^shared-types inventory/);
});

test('--json writes the whole report and prints where', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'inv-')), 'report.json');
  const { out, log, readFiles } = io();
  assert.equal(runCli(['--json', file], { log, readFiles }), 0);
  const report = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(report.files, 8);
  assert.ok(Array.isArray(report.byShape));
  assert.match(out.join('\n'), /report\.json/);
});

test('an unknown flag or a missing file name is refused', () => {
  for (const argv of [['--yaml'], ['--json']]) {
    const { out, log, readFiles } = io();
    assert.equal(runCli(argv, { log, readFiles }), 2, argv.join(' '));
    assert.match(out.join('\n'), /usage/);
  }
});
