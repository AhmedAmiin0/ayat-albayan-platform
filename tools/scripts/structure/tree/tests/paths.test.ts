import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathProblems, relativeReads } from '../paths.ts';
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
  ].join('\n');
  assert.deepEqual(relativeReads(text), ['../app.json', './..', '../babel.config.cjs']);
});

test('a moved test that climbs to a staying file breaks', () => {
  const before = ['m/src/i18n.test.ts', 'm/app.json'];
  const m = moves(before, [['m/src/i18n.test.ts', 'm/src/tests/i18n.test.ts']]);
  const text = "readFileSync(new URL('../app.json', import.meta.url));";
  assert.deepEqual(pathProblems([{ file: 'm/src/i18n.test.ts', text }], m), [
    "relative path breaks: m/src/i18n.test.ts reads '../app.json' (m/app.json → m/app.json)",
  ]);
});

test('a read that moves with its target, or that reached nothing, is fine', () => {
  const before = ['m/a/t.test.ts', 'm/a/fixture.json', 'm/b/t.test.ts'];
  const m = moves(before, [
    ['m/a/t.test.ts', 'm/f/a/t.test.ts'],
    ['m/a/fixture.json', 'm/f/a/fixture.json'],
  ]);
  const sources = [
    { file: 'm/a/t.test.ts', text: "read('./fixture.json'); read('./missing.json');" },
    { file: 'm/b/t.test.ts', text: 'const ROOT = `${__dirname}/..`;' },
  ];
  assert.deepEqual(pathProblems(sources, m), []);
});

test('a staying file that reads a folder that moved breaks', () => {
  const before = ['m/scan.test.ts', 'm/src/a/x.ts'];
  const m = moves(before, [['m/src/a/x.ts', 'm/src/f/a/x.ts']]);
  const text = "const dir = join(__dirname, 'src', 'a');";
  assert.deepEqual(pathProblems([{ file: 'm/scan.test.ts', text }], m), [
    "relative path breaks: m/scan.test.ts reads 'src/a' (m/src/a → m/src/f/a)",
  ]);
});
