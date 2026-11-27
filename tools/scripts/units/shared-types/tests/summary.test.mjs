import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport } from '../build.mjs';
import { summaryText } from '../summary.mjs';
import { FILES } from './fixtures.mjs';

const text = summaryText(buildReport(FILES));
const line = (start) => text.split('\n').find((l) => l.startsWith(start));

test('prints the file, declaration and parse counts', () => {
  assert.equal(line('files:'), 'files: 8 read, 1 not parsed, 7 declarations');
});

test('prints counts per workspace and per kind, in a fixed order', () => {
  assert.equal(line('  apps/api:'), '  apps/api: 2 (interface 1, literal-union 1)');
  assert.equal(
    line('kinds:'),
    'kinds: const-object 0, interface 4, literal-union 1, type 1, z-enum 1',
  );
});

test('prints the group and import counts', () => {
  assert.equal(line('names in 2+ workspaces:'), 'names in 2+ workspaces: 2');
  assert.equal(line('same-shape groups:'), 'same-shape groups: 2');
  assert.equal(line('imported by another workspace:'), 'imported by another workspace: 1');
  assert.equal(line('marked:'), 'marked: 2 (imported-across 0, same-shape 2), needs a decision 0');
});

test('lists the largest groups by importers, then by label', () => {
  const rows = text.split('\n').filter((l) => /^ {2}\d+\. /.test(l));
  assert.equal(rows[0], '  1. name Total: 1 importer (apps/staff-web); declared in 2 workspaces');
  assert.ok(rows.length <= 25);
});

test('the same tree prints the same text', () => {
  assert.equal(summaryText(buildReport(new Map([...FILES].reverse()))), text);
});
