import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facadeProblems } from '../names/facades.ts';

const R = 'apps/w/src/features';
const layer = { workspace: 'apps/w', root: R, extras: [], routes: [], alias: true };
const domains = [
  { domain: 'finance', groups: [], features: ['expenses', 'payouts'] },
  { domain: 'messaging', groups: ['notifications'], features: ['notifications/bell'] },
];
const scope = { layer, domains };

test('a feature barrel may re-export its own units', () => {
  const text = "export { A } from './A';\nexport * from './list/List';\n";
  assert.deepEqual(facadeProblems([{ file: `${R}/finance/expenses/index.ts`, text }], scope), []);
});

test('a feature barrel that re-exports another feature is a facade', () => {
  const text = [
    "export { ExpensesScreen } from './screens';",
    "export { PayoutsScreen } from '../payouts/screens';",
    "export type { P } from '@/features/finance/payouts';",
  ].join('\n');
  assert.deepEqual(facadeProblems([{ file: `${R}/finance/expenses/index.ts`, text }], scope), [
    `facade: ${R}/finance/expenses/index.ts re-exports ../payouts/screens from outside ${R}/finance/expenses`,
    `facade: ${R}/finance/expenses/index.ts re-exports @/features/finance/payouts from outside ${R}/finance/expenses`,
  ]);
});

test('a unit barrel inside a grouped feature stays inside it', () => {
  const file = `${R}/messaging/notifications/bell/list/index.ts`;
  const ok = facadeProblems([{ file, text: "export { L } from '../shared/l';" }], scope);
  assert.deepEqual(ok, []);
});

test('files that are not barrels and barrels outside the feature root are skipped', () => {
  const text = "export { X } from '../../other';";
  const files = [
    { file: `${R}/finance/expenses/x.ts`, text },
    { file: 'apps/w/src/shell/index.ts', text },
  ];
  assert.deepEqual(facadeProblems(files, scope), []);
});

test('a file at domain or group level belongs to no feature', async () => {
  const { featureOf } = await import('../names/feature-of.ts');
  const { allowedTree } = await import('../names/allowed.ts');
  const ctx = { layer, allowed: allowedTree(domains) };
  assert.equal(featureOf(`${R}/finance/loose.ts`, ctx), undefined);
  assert.equal(featureOf(`${R}/messaging/notifications/index.ts`, ctx), undefined);
  assert.equal(featureOf(`${R}/finance/expenses/a/b.ts`, ctx), `${R}/finance/expenses`);
  assert.equal(
    featureOf(`${R}/messaging/notifications/bell/x.ts`, ctx),
    `${R}/messaging/notifications/bell`,
  );
});

test('a barrel outside every domain (core/) is not checked; a domain barrel is', () => {
  const text = "export * from '../../other';";
  const core = facadeProblems([{ file: `${R}/core/errors/index.ts`, text }], scope);
  assert.deepEqual(core, []);
  const domain = facadeProblems(
    [{ file: `${R}/finance/index.ts`, text: "export * from '../messaging/x';" }],
    scope,
  );
  assert.deepEqual(domain, [
    `facade: ${R}/finance/index.ts re-exports ../messaging/x from outside ${R}/finance`,
  ]);
});
