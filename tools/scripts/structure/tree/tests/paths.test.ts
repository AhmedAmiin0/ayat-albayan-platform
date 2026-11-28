import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEdits, pathFixes, relativeReads } from '../paths.ts';
import { foldersOf } from '../folders.ts';

const moves = (before: string[], pairs: [string, string][]) => ({
  files: new Map(pairs),
  before: new Set(before),
  folders: foldersOf(before),
});

test('finds reads relative to the file, not module specifiers', () => {
  const text = [
    "import x from '../x';",
    "const y = await import('./y');",
    "vi.mock('../z');",
    "const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));",
    'const ROOT = `${__dirname}/..`;',
    "const cfg = join(__dirname, '..', 'babel.config.cjs');",
    'const t = `../../app/(${tree})`;',
  ].join('\n');
  assert.deepEqual(
    relativeReads(text).map((r) => r.rel),
    ['../app.json', '../../app', './..', '../babel.config.cjs'],
  );
});

test('a moved test that climbs to a staying file gets the new climb', () => {
  const before = ['m/src/i18n.test.ts', 'm/app.json'];
  const m = moves(before, [['m/src/i18n.test.ts', 'm/src/tests/i18n.test.ts']]);
  const text =
    "readFileSync(new URL('../app.json', import.meta.url)); const R = `${__dirname}/..`;";
  const out = pathFixes([{ file: 'm/src/i18n.test.ts', text }], m);
  assert.deepEqual(out.problems, []);
  const edits = out.edits.get('m/src/i18n.test.ts') ?? [];
  assert.equal(
    applyEdits(text, edits),
    "readFileSync(new URL('../../app.json', import.meta.url)); const R = `${__dirname}/../..`;",
  );
});

test('a template head follows too', () => {
  const before = ['m/src/core/push/r.test.ts', 'm/app/x.tsx'];
  const m = moves(before, [
    ['m/src/core/push/r.test.ts', 'm/src/features/messaging/push/r.test.ts'],
  ]);
  const text = 'const a = [`../../../app/(${t})`];';
  const edits = pathFixes([{ file: 'm/src/core/push/r.test.ts', text }], m).edits;
  assert.equal(
    applyEdits(text, edits.get('m/src/core/push/r.test.ts') ?? []),
    'const a = [`../../../../app/(${t})`];',
  );
});

test('a read that moves with its target, or that reached nothing, is left alone', () => {
  const before = ['m/a/t.test.ts', 'm/a/fixture.json', 'm/b/t.test.ts'];
  const m = moves(before, [
    ['m/a/t.test.ts', 'm/f/a/t.test.ts'],
    ['m/a/fixture.json', 'm/f/a/fixture.json'],
  ]);
  const sources = [
    { file: 'm/a/t.test.ts', text: "read('./fixture.json'); read('./missing.json');" },
    { file: 'm/b/t.test.ts', text: 'const ROOT = `${__dirname}/..`;' },
  ];
  assert.deepEqual(pathFixes(sources, m), { edits: new Map(), problems: [] });
});

test('a multi-part join that breaks is reported for a hand fix', () => {
  const before = ['m/scan.test.ts', 'm/src/a/x.ts'];
  const m = moves(before, [['m/src/a/x.ts', 'm/src/f/a/x.ts']]);
  const text = "const dir = join(__dirname, 'src', 'a');";
  assert.deepEqual(pathFixes([{ file: 'm/scan.test.ts', text }], m).problems, [
    "relative path breaks: m/scan.test.ts reads 'src/a' (now m/src/f/a)",
  ]);
});
