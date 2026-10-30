import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grepFiles, identifierTable, renameGuardLine, renameIdentifiers, renameProblems } from './identifiers.mjs';

const mapEntry = (status, file = 'refactor/moves/r1.json') => ({ status, from: file, to: file });
const reader = (base, head) => (side) => JSON.stringify({ renames: side === 'base' ? base : head });
const T = identifierTable([mapEntry('A')], reader({}, { PayoutsRepo: 'PayoutsRepo' }));

test('renames whole identifiers only, outside strings, templates and comments', () => {
  const before = "import { PayoutsQueries } from './x';\n// PayoutsQueries\nconst a = new PayoutsQueries('PayoutsQueries', `PayoutsQueries`);\nconst PayoutsQueriesRow = m.PayoutsQueries;\n/* PayoutsQueries */\n";
  const after = "import { PayoutsRepo } from './x';\n// PayoutsQueries\nconst a = new PayoutsRepo('PayoutsQueries', `PayoutsQueries`);\nconst PayoutsQueriesRow = m.PayoutsRepo;\n/* PayoutsQueries */\n";
  assert.equal(renameIdentifiers(before, T), after);
  assert.equal(renameIdentifiers(before, new Map()), before);
  assert.equal(renameIdentifiers("const s = 'it\\'s PayoutsQueries'; PayoutsQueries;", T), "const s = 'it\\'s PayoutsQueries'; PayoutsRepo;");
});

test('only D2 renames (<X>Queries → <X>Repo, same X): keywords, literals and other names are refused', () => {
  assert.deepEqual([...T], [['PayoutsQueries', 'PayoutsRepo']]);
  for (const bad of [{ true: 'false' }, { if: 'while' }, { isAdmin: 'isTeacher' }, { PayoutsRepo: 'LessonsRepo' }, { Queries: 'Repo' }]) {
    assert.throws(() => identifierTable([mapEntry('A')], reader({}, bad)), /only <X>Queries/, JSON.stringify(bad));
  }
});

test('an edited map adds only its new renames; the older ones stay off', () => {
  const old = { AQueries: 'ARepo' };
  assert.deepEqual([...identifierTable([mapEntry('M')], reader(old, { ...old, BQueries: 'BRepo' }))], [['BQueries', 'BRepo']]);
  assert.deepEqual([...identifierTable([mapEntry('M', 'apps/x.json')], reader({}, old))], []);
});

test('a rename must be fresh: new name nowhere in base, old one declared in a file of the diff', () => {
  const grep = (re, files) => (re.includes('Repo') ? ['a.ts'] : files?.includes('m/payouts.queries.ts') ? ['m/payouts.queries.ts'] : []);
  assert.deepEqual(renameProblems(T, grep, ['m/payouts.queries.ts']), ['PayoutsRepo already exists in the base tree']);
  assert.deepEqual(renameProblems(T, () => [], ['x.ts']), ['PayoutsQueries is not declared in a file of this diff']);
  assert.deepEqual(renameProblems(T, (re) => (re.includes('Repo') ? [] : ['p.ts']), ['p.ts']), []);
});

test('git grep: no match is an empty list, any other failure throws', () => {
  assert.deepEqual(grepFiles(() => 'a.ts\nb.ts\n'), ['a.ts', 'b.ts']);
  assert.deepEqual(grepFiles(() => { throw Object.assign(new Error('x'), { status: 1 }); }), []);
  assert.throws(() => grepFiles(() => { throw Object.assign(new Error('bad ref'), { status: 128 }); }), /bad ref/);
});

test('a knip guard line follows its renamed name', () => {
  assert.equal(renameGuardLine('a.ts exports PayoutsQueries', T), 'a.ts exports PayoutsRepo');
  assert.equal(renameGuardLine('a.ts types PayoutsQueriesRow', T), 'a.ts types PayoutsQueriesRow');
  assert.equal(renameGuardLine('lonely', T), 'lonely');
});
