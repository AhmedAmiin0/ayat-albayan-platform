import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyBaseline, folderCapMoved, knipMoved, relativePairs, suppressionsMoved } from './baselines.mjs';

const RENAMES = [
  ['apps/web/src/features/payouts/PayoutsPage.tsx', 'apps/web/src/features/payouts/list/PayoutsPage.tsx'],
  ['apps/web/src/features/payouts/use-pay.ts', 'apps/web/src/features/payouts/pay/use-pay.ts'],
];
const entry = (count) => ({ 'ab/module-boundaries': { count } });
const SUPP = { 'src/boot.tsx': entry(1), 'src/features/payouts/PayoutsPage.tsx': entry(4), 'src/features/payouts/use-pay.ts': entry(3) };
const moved = { ...SUPP };
delete moved['src/features/payouts/PayoutsPage.tsx'];
delete moved['src/features/payouts/use-pay.ts'];
Object.assign(moved, { 'src/features/payouts/list/PayoutsPage.tsx': entry(4), 'src/features/payouts/pay/use-pay.ts': entry(3) });
const texts = (base, head) => ({ base: JSON.stringify(base, null, 2), head: JSON.stringify(head, null, 2) });
const FILE = 'apps/web/eslint-suppressions.json';

test('relative pairs: only moves inside the package, without its prefix', () => {
  assert.deepEqual(relativePairs('apps/web', [...RENAMES, ['apps/web/src/a.ts', 'packages/x/src/a.ts']]), [
    ['src/features/payouts/PayoutsPage.tsx', 'src/features/payouts/list/PayoutsPage.tsx'],
    ['src/features/payouts/use-pay.ts', 'src/features/payouts/pay/use-pay.ts'],
  ]);
});

test('suppressions: a moved file keeps its entry under its new package-relative key (any key order)', () => {
  assert.equal(suppressionsMoved(FILE, texts(SUPP, moved), RENAMES), true);
  const reordered = Object.fromEntries(Object.entries(moved).reverse());
  assert.equal(suppressionsMoved(FILE, texts(SUPP, reordered), RENAMES), true);
  assert.equal(suppressionsMoved(FILE, texts(SUPP, SUPP), []), true);
});

test('suppressions: a changed count, an added or dropped key, an unmoved rename all fail', () => {
  assert.equal(suppressionsMoved(FILE, texts(SUPP, { ...moved, 'src/boot.tsx': entry(2) }), RENAMES), false);
  assert.equal(suppressionsMoved(FILE, texts(SUPP, { ...moved, 'src/new.ts': entry(1) }), RENAMES), false);
  const dropped = { ...moved };
  delete dropped['src/boot.tsx'];
  assert.equal(suppressionsMoved(FILE, texts(SUPP, dropped), RENAMES), false);
  const rule = { ...moved, 'src/boot.tsx': { 'other/rule': { count: 1 } } };
  assert.equal(suppressionsMoved(FILE, texts(SUPP, rule), RENAMES), false);
  assert.equal(suppressionsMoved(FILE, texts(SUPP, moved), []), false, 'keys renamed without a move');
  const wrong = { ...moved };
  delete wrong['src/features/payouts/pay/use-pay.ts'];
  wrong['src/features/payouts/use-pay2.ts'] = entry(3);
  assert.equal(suppressionsMoved(FILE, texts(SUPP, wrong), RENAMES), false);
  assert.equal(suppressionsMoved(FILE, { base: '{}', head: 'not json' }, RENAMES), false);
  assert.equal(suppressionsMoved('apps/mobile/eslint-suppressions.json', texts(SUPP, moved), RENAMES), false, 'other package');
});

test('suppressions: two entries landing on one key, or a file moved onto a stale key, fail', () => {
  const base = { 'src/a.ts': entry(1), 'src/b.ts': entry(1) };
  assert.equal(suppressionsMoved(FILE, texts(base, { 'src/b.ts': entry(1) }), [['apps/web/src/a.ts', 'apps/web/src/b.ts']]), false);
  assert.equal(suppressionsMoved(FILE, texts(base, base), [['apps/web/src/c.ts', 'apps/web/src/b.ts']]), false, 'stale key');
});

const KNIP = ['apps/web/src/features/payouts/use-pay.ts exports usePay', 'apps/api/src/x.ts types X'];

test('knip: lines follow their moved file and may drop; a new or edited line fails', () => {
  const head = ['apps/api/src/x.ts types X', 'apps/web/src/features/payouts/pay/use-pay.ts exports usePay'];
  assert.equal(knipMoved(texts(KNIP, head), RENAMES), true);
  assert.equal(knipMoved(texts(KNIP, head.slice(0, 1)), RENAMES), true);
  assert.equal(knipMoved(texts(KNIP, [...head, 'apps/api/src/y.ts types Y']), RENAMES), false);
  assert.equal(knipMoved(texts(KNIP, ['apps/api/src/x.ts types Z']), RENAMES), false);
  assert.equal(knipMoved(texts(KNIP, head), []), false);
});

const CAP = { 'apps/web/src/features/payouts': { files: 20, dirs: 0 }, 'apps/web/src/old': { files: 14, dirs: 1 } };
const OLD = [['apps/web/src/old/a.ts', 'apps/web/src/new/a.ts']];

test('folder cap: entries may shrink, drop or follow a folder moved whole; growing or new ones fail', () => {
  const gone = (dir) => dir === 'apps/web/src/old';
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/old': CAP['apps/web/src/old'] }), RENAMES, gone), true);
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/features/payouts': { files: 13, dirs: 2 } }), RENAMES, gone), false);
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/features/payouts': { files: 13, dirs: 0 } }), RENAMES, gone), true);
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/new': { files: 14, dirs: 1 } }), OLD, gone), true);
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/new': { files: 14, dirs: 1 } }), OLD, () => false), false);
  assert.equal(folderCapMoved(texts(CAP, { 'apps/web/src/other': { files: 13, dirs: 0 } }), RENAMES, gone), false);
});

test('classifyBaseline: only baseline files, edited in place', () => {
  const read = (side) => JSON.stringify(side === 'base' ? SUPP : moved);
  const ctx = { renames: RENAMES };
  assert.deepEqual(classifyBaseline({ status: 'M', from: FILE, to: FILE }, read, ctx), { kind: 'paths' });
  assert.equal(classifyBaseline({ status: 'M', from: FILE, to: FILE }, read, { renames: [] }).kind, 'bad');
  assert.equal(classifyBaseline({ status: 'A', from: FILE, to: FILE }, read, ctx).kind, 'bad');
  assert.equal(classifyBaseline({ status: 'R100', from: FILE, to: 'packages/x/eslint-suppressions.json' }, read, ctx).kind, 'bad');
  assert.equal(classifyBaseline({ status: 'D', from: 'refactor/folder-cap/web.json', to: 'refactor/folder-cap/web.json' }, read, ctx).kind, 'bad');
  assert.equal(classifyBaseline({ status: 'M', from: 'refactor/guards/knip.json', to: 'refactor/guards/knip.json' }, read, ctx).kind, 'bad');
  assert.equal(classifyBaseline({ status: 'M', from: 'apps/web/package.json', to: 'apps/web/package.json' }, read, ctx), null);
  assert.equal(classifyBaseline({ status: 'M', from: 'refactor/guards/jscpd.json', to: 'refactor/guards/jscpd.json' }, read, ctx), null);
});
