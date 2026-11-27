import assert from 'node:assert/strict';
import { test } from 'node:test';
import { domainOf, isScanned, targetOf, workspaceOf } from '../files.mjs';

test('scans app and package sources only', () => {
  for (const path of [
    'apps/api/src/modules/sales/leads/lead.types.ts',
    'packages/shared/src/sales/leads/lead.schemas.ts',
    'apps/staff-web/src/features/people/RoleDialog/RoleDialog.tsx',
  ]) {
    assert.equal(isScanned(path), true, path);
  }
});

test('skips tests, testing helpers, declarations, generated files and other roots', () => {
  for (const path of [
    'apps/api/src/modules/sales/lead.service.test.ts',
    'apps/staff-web/src/features/people/tests/a.ts',
    'apps/staff-web/src/test/setup.ts',
    'packages/shared/src/testing/lesson.builder.ts',
    'apps/staff-web/src/routeTree.gen.ts',
    'packages/core/src/env.d.ts',
    'apps/staff-web/e2e/journey.spec.ts',
    'tools/scripts/units/fold.ts',
    'packages/config/eslint-flow.js',
    'apps/api/src/x.spec.tsx',
  ]) {
    assert.equal(isScanned(path), false, path);
  }
});

test('names the workspace of a path', () => {
  assert.equal(workspaceOf('apps/api/src/main.ts'), 'apps/api');
  assert.equal(workspaceOf('packages/client-core/src/core/http.ts'), 'packages/client-core');
});

test('resolves an import specifier to the workspace it reads', () => {
  const from = 'apps/api/src/modules/sales/lead.service.ts';
  assert.equal(targetOf('@ab/shared', from), 'packages/shared');
  assert.equal(targetOf('@ab/core/schemas', from), 'packages/core');
  assert.equal(targetOf('@/features/people', 'apps/staff-web/src/a.ts'), 'apps/staff-web');
  assert.equal(targetOf('./lead.types', from), 'apps/api');
  assert.equal(targetOf('../lead.types', from), 'apps/api');
  assert.equal(targetOf('../../../../staff-web/src/x', from), 'apps/staff-web');
  assert.equal(targetOf('../../../../../e2e/x', from), null);
  assert.equal(targetOf('zod', from), null);
  assert.equal(targetOf('@tanstack/react-query', from), null);
});

test('reads a domain from a path, or none', () => {
  assert.equal(domainOf('apps/api/src/modules/finance/payouts/payout.types.ts'), 'finance');
  assert.equal(domainOf('apps/staff-mobile/src/sales/lead.ts'), 'sales');
  assert.equal(domainOf('apps/staff-mobile/src/booking/slot.ts'), null);
  assert.equal(domainOf('packages/web-kit/src/Button/Button.types.ts'), null);
});
