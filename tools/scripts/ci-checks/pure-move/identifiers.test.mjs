import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grepFiles, identifierTable, renameGuardLine, renameIdentifiers, renameProblems } from './identifiers.mjs';

const mapEntry = (status, file = 'refactor/moves/r1.json') => ({ status, from: file, to: file });
const reader = (base, head) => (side) => JSON.stringify({ renames: side === 'base' ? base : head });
const T = identifierTable([mapEntry('A')], reader({}, { WidgetQueries: 'WidgetRepo' }));

test('renames whole identifiers only, outside strings, templates and comments', () => {
  const before = "import { WidgetQueries } from './x';\n// WidgetQueries\nconst a = new WidgetQueries('WidgetQueries', `WidgetQueries`);\nconst WidgetQueriesRow = m.WidgetQueries;\n/* WidgetQueries */\n";
  const after = "import { WidgetRepo } from './x';\n// WidgetQueries\nconst a = new WidgetRepo('WidgetQueries', `WidgetQueries`);\nconst WidgetQueriesRow = m.WidgetRepo;\n/* WidgetQueries */\n";
  assert.equal(renameIdentifiers(before, T), after);
  assert.equal(renameIdentifiers(before, new Map()), before);
  assert.equal(renameIdentifiers("const s = 'it\\'s WidgetQueries'; WidgetQueries;", T), "const s = 'it\\'s WidgetQueries'; WidgetRepo;");
});

test('only D2 renames (<X>Queries → <X>Repo, same X): keywords, literals and other names are refused', () => {
  assert.deepEqual([...T], [['WidgetQueries', 'WidgetRepo']]);
  for (const bad of [{ true: 'false' }, { if: 'while' }, { isAdmin: 'isTeacher' }, { WidgetQueries: 'LessonsRepo' }, { Queries: 'Repo' }]) {
    assert.throws(() => identifierTable([mapEntry('A')], reader({}, bad)), /only <X>Queries/, JSON.stringify(bad));
  }
});

test('an edited map adds only its new renames; the older ones stay off', () => {
  const old = { AQueries: 'ARepo' };
  assert.deepEqual([...identifierTable([mapEntry('M')], reader(old, { ...old, BQueries: 'BRepo' }))], [['BQueries', 'BRepo']]);
  assert.deepEqual([...identifierTable([mapEntry('M', 'apps/x.json')], reader({}, old))], []);
});

test('a rename must be fresh: new name nowhere in base, old one declared in a file of the diff', () => {
  const grep = (re, files) => (re.includes('Repo') ? ['a.ts'] : files?.includes('m/widget.queries.ts') ? ['m/widget.queries.ts'] : []);
  assert.deepEqual(renameProblems(T, grep, ['m/widget.queries.ts']), ['WidgetRepo already exists in the base tree']);
  assert.deepEqual(renameProblems(T, () => [], ['x.ts']), ['WidgetQueries is not declared in a file of this diff']);
  assert.deepEqual(renameProblems(T, (re) => (re.includes('Repo') ? [] : ['p.ts']), ['p.ts']), []);
});

test('git grep: no match is an empty list, any other failure throws', () => {
  assert.deepEqual(grepFiles(() => 'a.ts\nb.ts\n'), ['a.ts', 'b.ts']);
  assert.deepEqual(grepFiles(() => { throw Object.assign(new Error('x'), { status: 1 }); }), []);
  assert.throws(() => grepFiles(() => { throw Object.assign(new Error('bad ref'), { status: 128 }); }), /bad ref/);
});

test('a knip guard line follows its renamed name', () => {
  assert.equal(renameGuardLine('a.ts exports WidgetQueries', T), 'a.ts exports WidgetRepo');
  assert.equal(renameGuardLine('a.ts types WidgetQueriesRow', T), 'a.ts types WidgetQueriesRow');
  assert.equal(renameGuardLine('lonely', T), 'lonely');
});
