import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureProblems } from '../features.ts';
import { nestProblems } from '../nest.ts';

const R = 'apps/w/src/features';
const layer = { workspace: 'apps/w', root: R, extras: ['core'], routes: [], alias: true };
const domains = [
  { domain: 'sales', groups: [], features: ['leads', 'money'] },
  { domain: 'messaging', groups: ['notifications'], features: ['inbox', 'notifications/bell'] },
];

test('a clean tree passes', () => {
  const files = [
    `${R}/sales/leads/index.ts`,
    `${R}/sales/leads/List/List.tsx`,
    `${R}/sales/tests/x.test.ts`,
    `${R}/messaging/notifications/bell/index.ts`,
    `${R}/core/http.ts`,
  ];
  assert.deepEqual(featureProblems(files, layer, domains), []);
});

test('reports unknown names with the closest allowed one', () => {
  const files = [`${R}/sale/leads/index.ts`, `${R}/sales/lead/index.ts`];
  assert.deepEqual(featureProblems(files, layer, domains), [
    `not a listed name: ${R}/sale (closest: sales)`,
    `not a listed name: ${R}/sales/lead (closest: leads)`,
  ]);
});

test('reports a feature without index.ts, a file at domain level and a file in a group', () => {
  const files = [
    `${R}/sales/money/Wallet.tsx`,
    `${R}/sales/keys.ts`,
    `${R}/messaging/notifications/index.ts`,
    `${R}/messaging/notifications/bell/index.ts`,
    `${R}/messaging/notifications/rules/index.ts`,
  ];
  assert.deepEqual(featureProblems(files, layer, domains), [
    `file in a group: ${R}/messaging/notifications/index.ts`,
    `not a listed name: ${R}/messaging/notifications/rules (closest: bell)`,
    `file at domain level: ${R}/sales/keys.ts`,
    `feature without index.ts: ${R}/sales/money`,
  ]);
});

test('a package group may hold an index.ts that re-exports its features', () => {
  const pkg = { ...layer, alias: false };
  const files = [
    `${R}/messaging/notifications/index.ts`,
    `${R}/messaging/notifications/bell/index.ts`,
  ];
  assert.deepEqual(featureProblems(files, pkg, domains), []);
});

test('an api feature with a controller needs a Nest module beside it; a unit may not', () => {
  const root = 'apps/api/src/modules';
  const api = { ...layer, workspace: 'apps/api', root };
  const files = [
    `${root}/sales/leads/leads.controller.ts`,
    `${root}/sales/leads/leads.module.ts`,
    `${root}/sales/money/money.controller.ts`,
    `${root}/sales/money/views/views.controller.ts`,
  ];
  assert.deepEqual(nestProblems(files, { layer: api, domains }), [
    `feature controller without a Nest module: ${root}/sales/money`,
  ]);
});
