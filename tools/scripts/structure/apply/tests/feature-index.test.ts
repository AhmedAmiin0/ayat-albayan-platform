import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newProject } from '../../../ci-checks/move-module/rewrite.ts';
import { allowedTree } from '../../tree/allowed.ts';
import { fixFeatureIndexes } from '../feature-index.ts';
import { tree } from './fixture.ts';

const W = 'apps/w';
const F = `${W}/src/features`;
const layer = { workspace: W, root: F, extras: [], routes: [`${W}/app`], alias: true };
const domains = [{ domain: 'finance', groups: [], features: ['expenses', 'payouts'] }];
const alias = { prefix: '@/', dir: `${W}/src`, scope: W };

function ctx(root: string, opts: { old: Record<string, string>; forced?: string[] }) {
  return {
    project: newProject(),
    r: { root, aliases: [alias], renamed: new Map<string, string>() },
    layer,
    allowed: allowedTree(domains),
    old: 'src/[^/]+',
    oldOf: (file: string) => opts.old[file] ?? file,
    forced: new Set(opts.forced ?? []),
  };
}

const files = {
  [`${F}/finance/expenses/index.ts`]: "export { ExpensesScreen } from './ExpensesScreen';\n",
  [`${F}/finance/expenses/ExpensesScreen.tsx`]: "import { Row, type RowProps } from '@/features/finance/payouts/Row';\n",
  [`${F}/finance/payouts/Row.tsx`]: 'export const Row = 1;\nexport type RowProps = {};\n',
  [`${W}/app/payouts.tsx`]: "import { Row } from '@/features/finance/payouts/Row';\n",
  [`${F}/finance/expenses/Old.tsx`]: "import { Row } from '@/features/finance/payouts/Row';\n",
};

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
  assert.equal(work.writes.get(`${W}/app/payouts.tsx`), "import { Row } from '@/features/finance/payouts';\n");
  assert.equal(work.writes.get(`${F}/finance/expenses/Old.tsx`), undefined);
  assert.equal(work.writes.get(`${F}/finance/payouts/index.ts`), "export { Row, type RowProps } from './Row';\n");
});

test('a name the index already exports from another file is a clash', () => {
  const root = tree({
    ...files,
    [`${F}/finance/payouts/index.ts`]: "export { Row } from './other';\n",
    [`${F}/finance/payouts/other.ts`]: 'export const Row = 2;\n',
  });
  const work = fixFeatureIndexes(ctx(root, { old: {} }), [`${W}/app/payouts.tsx`]);
  assert.deepEqual(work.problems, [`${F}/finance/payouts/index.ts already exports another Row`]);
});

test('a barrel import the redirect wrote is fixed even across old modules', () => {
  const root = tree(files);
  const file = `${F}/finance/expenses/Old.tsx`;
  const work = fixFeatureIndexes(ctx(root, { old: {}, forced: [`${file}→${F}/finance/payouts/Row.tsx`] }), [file]);
  assert.equal(work.writes.get(file), "import { Row } from '@/features/finance/payouts';\n");
});

test('export * of a deep file goes through the feature index once', () => {
  const root = tree({
    ...files,
    [`${W}/src/index.ts`]: "export * from './features/finance/payouts/Row';\nexport * from './features/finance/payouts/More';\n",
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
