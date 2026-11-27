import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReport } from '../build.mjs';
import { FILES } from './fixtures.mjs';

const report = buildReport(FILES);
const decl = (path, name) => report.declarations.find((d) => d.path === path && d.name === name);
const API = 'apps/api/src/modules/sales/leads/lead.types.ts';
const WEB = 'apps/staff-web/src/features/sales/leads/stage.ts';
const MOBILE = 'apps/staff-mobile/src/sales/leads/stage.ts';

test('reads only scanned files and reports the one that does not parse', () => {
  assert.equal(report.files, 8);
  assert.deepEqual(
    report.unparsed.map((u) => u.path),
    ['apps/staff-web/src/broken.ts'],
  );
  assert.equal(decl('apps/staff-web/src/x.test.ts', 'Hidden'), undefined);
});

test('lists the workspaces that import each declaration', () => {
  assert.deepEqual(decl(API, 'LeadRow')?.importers, []);
  assert.deepEqual(decl('packages/shared/src/finance/total.ts', 'Total')?.importers, [
    'apps/staff-web',
  ]);
  assert.deepEqual(decl(WEB, 'leadStage')?.importers, []);
  assert.deepEqual(decl(MOBILE, 'Total')?.importers, []);
});

test('groups one name declared in two workspaces, whatever the shapes', () => {
  const total = report.byName.find((g) => g.name === 'Total');
  assert.deepEqual(total?.workspaces, ['apps/staff-mobile', 'packages/shared']);
  assert.deepEqual(total?.importers, ['apps/staff-web']);
  assert.equal(
    report.byName.some((g) => g.name === 'LeadRow'),
    false,
  );
});

test('groups one shape across workspaces, whatever the names and kinds', () => {
  const stage = report.byShape.find((g) => g.shape === 'lit:"new"|"won"');
  assert.deepEqual(stage?.workspaces, ['apps/api', 'apps/staff-web']);
  assert.deepEqual(stage?.declarations, [`${API}::LeadStage`, `${WEB}::leadStage`]);
});

test('marks an app declaration of a cross-workspace shape group, not the package one', () => {
  assert.deepEqual(decl(API, 'LeadStage')?.marks, ['same-shape']);
  assert.deepEqual(decl(WEB, 'leadStage')?.marks, ['same-shape']);
  assert.deepEqual(decl('packages/web-kit/src/Badge/Badge.types.ts', 'BadgeProps')?.marks, []);
});

test('marks an app declaration another workspace imports', () => {
  const from = '../../../../apps/api/src/modules/sales/leads/lead.types';
  const files = new Map([
    ...FILES,
    ['packages/client-core/src/sales/x.ts', `import type { LeadRow } from '${from}';\n`],
  ]);
  const row = buildReport(files).declarations.find((d) => d.name === 'LeadRow');
  assert.deepEqual(row?.importers, ['packages/client-core']);
  assert.deepEqual(row?.marks, ['imported-across']);
});

test('a package declaration that apps import is not marked', () => {
  assert.deepEqual(decl('packages/shared/src/finance/total.ts', 'Total')?.marks, []);
});

test('two runs on the same tree give the same report', () => {
  const shuffled = new Map([...FILES].reverse());
  assert.deepEqual(buildReport(shuffled), report);
});

test('a marked declaration gets a proposed home from its group; an unmarked one none', () => {
  assert.equal(decl(API, 'LeadStage')?.home, 'a z.enum in packages/shared/src/sales/');
  assert.equal(decl(API, 'LeadRow')?.home, undefined);
});
