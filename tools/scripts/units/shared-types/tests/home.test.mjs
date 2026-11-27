import assert from 'node:assert/strict';
import { test } from 'node:test';
import { homeOf } from '../home.mjs';

const at = (path, extra = {}) => ({
  name: 'Thing',
  kind: 'type',
  wire: false,
  path,
  ws: path.split('/').slice(0, 2).join('/'),
  importers: [],
  ...extra,
});
const API = 'apps/api/src/modules/sales/leads/lead.types.ts';
const WEB = 'apps/staff-web/src/features/sales/leads/stage.ts';
const MOBILE = 'apps/staff-mobile/src/sales/leads/stage.ts';
const PKG = 'packages/shared/src/sales/leads/lead.schemas.ts';

test('component props stay with their component', () => {
  const row = at('packages/web-kit/src/Badge/Badge.types.ts', { name: 'BadgeProps' });
  assert.deepEqual(homeOf(row, []), { home: 'stays with its component (Name.types.ts)' });
});

test('design values go to the catalog theme', () => {
  const row = at(WEB, { name: 'STAGE_COLORS', kind: 'const-object' });
  assert.deepEqual(homeOf(row, []), { home: 'packages/catalog/src/theme' });
});

test('an enum goes to the package that declares it already', () => {
  const row = at(API, { kind: 'literal-union' });
  const pkg = at(PKG, { kind: 'z-enum' });
  assert.deepEqual(homeOf(row, [row, pkg]), { home: `a z.enum in ${PKG}` });
});

test('an enum declared only in apps goes to its domain in the shared package', () => {
  const row = at(API, { kind: 'z-enum' });
  const peer = at(WEB, { kind: 'literal-union' });
  assert.deepEqual(homeOf(row, [row, peer]), { home: 'a z.enum in packages/shared/src/sales/' });
});

test('wire data goes to its schema, with its z.infer type', () => {
  const row = at(API, { wire: true });
  assert.deepEqual(homeOf(row, [row]), {
    home: 'the schema in packages/shared/src/sales/ with its z.infer type',
  });
});

test('a non-wire type that web and mobile share goes to client-core', () => {
  const row = at(WEB, { importers: ['apps/staff-mobile'] });
  assert.deepEqual(homeOf(row, [row]), { home: 'packages/client-core/src/sales/' });
});

test('a web type with the same shape as a mobile one goes to client-core', () => {
  const row = at(WEB);
  const peer = at(MOBILE, { kind: 'interface' });
  assert.deepEqual(homeOf(row, [row, peer]), { home: 'packages/client-core/src/sales/' });
});

test('no common domain: needs a decision, with the reason', () => {
  const row = at(API, { kind: 'z-enum' });
  const peer = at('apps/staff-mobile/src/booking/slot.ts', { kind: 'literal-union' });
  assert.deepEqual(homeOf(row, [row, peer]), {
    decision: 'needs a decision: an enum declared only in apps whose paths name no one domain',
  });
});

test('two packages declare it: needs a decision', () => {
  const row = at(API, { kind: 'z-enum' });
  const a = at(PKG, { kind: 'z-enum' });
  const b = at('packages/client-core/src/sales/stage.ts', { kind: 'z-enum' });
  assert.match(homeOf(row, [row, a, b]).decision ?? '', /two or more package files/);
});

test('api and one client share a non-wire type: needs a decision', () => {
  const row = at(API, { importers: ['packages/client-core'] });
  assert.match(homeOf(row, [row]).decision ?? '', /not wire data/);
});

test('web and mobile share it but no domain: needs a decision', () => {
  const row = at(MOBILE.replace('sales', 'booking'), { importers: ['apps/staff-web'] });
  assert.match(homeOf(row, [row]).decision ?? '', /no one domain/);
});
