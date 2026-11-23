import assert from 'node:assert/strict';
import { test } from 'node:test';
import { baseOf } from './spec-base.mjs';

test('baseOf: `#/` is the importing workspace\'s src, the app or the kit itself', () => {
  assert.equal(baseOf('apps/family-web/src/a/b.tsx', '#/lib/x.ts'), 'apps/family-web/src/lib/x.ts');
  assert.equal(baseOf('packages/web-kit/src/auth/a.ts', '#/lib/i18n/index.ts'), 'packages/web-kit/src/lib/i18n/index.ts');
  assert.equal(baseOf('e2e/tests/a.spec.ts', '#/lib/x.ts'), null);
});

test('baseOf: `@ab/web-kit/<entry>` is the file its package.json `exports` names', () => {
  assert.equal(baseOf('apps/family-web/src/a.ts', '@ab/web-kit/form'), 'packages/web-kit/src/components/ui/form/index.ts');
  assert.equal(baseOf('apps/staff-web/src/a.ts', '@ab/web-kit/lib/clock'), 'packages/web-kit/src/lib/clock', 'deep, until staff-web moves');
});

test('baseOf: `@/` (tsconfig paths) and `./` as before; a package is null', () => {
  assert.equal(baseOf('apps/staff-web/src/a/b.tsx', '@/lib/i18n'), 'apps/staff-web/src/lib/i18n');
  assert.equal(baseOf('apps/api/src/m/z.ts', './y'), 'apps/api/src/m/y');
  assert.equal(baseOf('apps/api/src/m/z.ts', 'zod'), null);
});
