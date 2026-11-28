import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixFeatureIndexes } from '../indexes/feature-index.ts';
import { tree } from './fixture.ts';
import { ctx, F, files, W } from './feature-index.fixture.ts';

test('imports the moves made cross-feature go through the feature index, which gains the names', () => {
  const root = tree(files);
  const old = {
    [`${F}/finance/expenses/ExpensesScreen.tsx`]: `${W}/src/money/ExpensesScreen.tsx`,
    [`${F}/finance/payouts/Row.tsx`]: `${W}/src/money/Row.tsx`,
    [`${F}/finance/expenses/Old.tsx`]: `${W}/src/old/Old.tsx`,
  };
  const work = fixFeatureIndexes(ctx(root, { old }), Object.keys(files));
  assert.deepEqual(work.problems, []);
  assert.equal(
    work.writes.get(`${F}/finance/expenses/ExpensesScreen.tsx`),
    "import { Row, type RowProps } from '@/features/finance/payouts';\n",
  );
  assert.equal(
    work.writes.get(`${W}/app/payouts.tsx`),
    "import { Row } from '@/features/finance/payouts';\n",
  );
  assert.equal(work.writes.get(`${F}/finance/expenses/Old.tsx`), undefined);
  assert.equal(
    work.writes.get(`${F}/finance/payouts/index.ts`),
    "export { Row, type RowProps } from './Row';\n",
  );
});

test('an import whose name the index exports for another file stays deep', () => {
  const root = tree({
    ...files,
    [`${F}/finance/payouts/index.ts`]: "export { Row } from './other';\n",
    [`${F}/finance/payouts/other.ts`]: 'export const Row = 2;\n',
  });
  const work = fixFeatureIndexes(ctx(root, { old: {} }), [`${W}/app/payouts.tsx`]);
  assert.deepEqual(work.problems, [
    `${W}/app/payouts.tsx: kept @/features/finance/payouts/Row, its feature index exports another name`,
  ]);
  assert.equal(work.writes.get(`${W}/app/payouts.tsx`), undefined);
});

test('a barrel import the redirect wrote is fixed even across old modules', () => {
  const root = tree(files);
  const file = `${F}/finance/expenses/Old.tsx`;
  const work = fixFeatureIndexes(
    ctx(root, { old: {}, forced: [`${file}→${F}/finance/payouts/Row.tsx`] }),
    [file],
  );
  assert.equal(work.writes.get(file), "import { Row } from '@/features/finance/payouts';\n");
});

test('export * of a deep file goes through the feature index once', () => {
  const root = tree({
    ...files,
    [`${W}/src/index.ts`]:
      "export * from './features/finance/payouts/Row';\nexport * from './features/finance/payouts/More';\n",
    [`${F}/finance/payouts/More.ts`]: 'export const M = 1;\n',
  });
  const file = `${W}/src/index.ts`;
  const forced = [`${file}→${F}/finance/payouts/Row.tsx`, `${file}→${F}/finance/payouts/More.ts`];
  const work = fixFeatureIndexes(ctx(root, { old: {}, forced }), [file]);
  assert.equal(work.writes.get(file), "export * from './features/finance/payouts';\n\n");
  assert.equal(
    work.writes.get(`${F}/finance/payouts/index.ts`),
    "export * from './Row';\nexport * from './More';\n",
  );
});

test('a feature with no index gets one from every import into it', () => {
  const root = tree(files);
  const file = `${F}/finance/expenses/Old.tsx`;
  const work = fixFeatureIndexes(
    { ...ctx(root, { old: {} }), open: new Set([`${F}/finance/payouts`]) },
    [file],
  );
  assert.equal(work.writes.get(file), "import { Row } from '@/features/finance/payouts';\n");
  assert.equal(work.writes.get(`${F}/finance/payouts/index.ts`), "export { Row } from './Row';\n");
});
