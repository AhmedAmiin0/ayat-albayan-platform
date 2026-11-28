import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixFeatureIndexes } from '../indexes/feature-index.ts';
import { tree } from './fixture.ts';
import { ctx, F, files, layer, W } from './feature-index.fixture.ts';

test('a package feature index re-exports whole files; a value use beats a type use in an app', () => {
  const root = tree({
    ...files,
    [`${F}/finance/expenses/Typed.tsx`]:
      "import type { Row } from '@/features/finance/payouts/Row';\n",
  });
  const old = {
    [`${F}/finance/expenses/Typed.tsx`]: `${W}/src/money/Typed.tsx`,
    [`${F}/finance/payouts/Row.tsx`]: `${W}/src/money/Row.tsx`,
    [`${F}/finance/expenses/ExpensesScreen.tsx`]: `${W}/src/money/E.tsx`,
  };
  const app = fixFeatureIndexes(ctx(root, { old }), [
    `${F}/finance/expenses/Typed.tsx`,
    `${F}/finance/expenses/ExpensesScreen.tsx`,
  ]);
  assert.equal(
    app.writes.get(`${F}/finance/payouts/index.ts`),
    "export { Row, type RowProps } from './Row';\n",
  );
  const pkg = { ...ctx(root, { old }), layer: { ...layer, alias: false } };
  const out = fixFeatureIndexes(pkg, [`${F}/finance/expenses/Typed.tsx`]);
  assert.equal(out.writes.get(`${F}/finance/payouts/index.ts`), "export * from './Row';\n");
});

test('a name two importers want from different files, or a type-only name a value import wants, stays deep', () => {
  const root = tree({
    ...files,
    [`${F}/finance/payouts/index.ts`]: "export type { Pay } from './pay';\n",
    [`${F}/finance/payouts/pay.ts`]: 'export const Pay = 1;\n',
    [`${F}/finance/payouts/fakes.ts`]: 'export const Row = 2;\n',
    [`${W}/app/a.tsx`]:
      "import { Row } from '@/features/finance/payouts/fakes';\nimport { Pay } from '@/features/finance/payouts/pay';\n",
  });
  const work = fixFeatureIndexes(ctx(root, { old: {} }), [
    `${W}/app/payouts.tsx`,
    `${W}/app/a.tsx`,
  ]);
  assert.equal(work.writes.get(`${W}/app/a.tsx`), undefined);
  assert.equal(work.writes.get(`${W}/app/payouts.tsx`), undefined);
  assert.equal(work.problems.length, 3);
});
