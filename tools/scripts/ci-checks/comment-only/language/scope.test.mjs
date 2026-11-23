import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scopeOf } from './scope.mjs';

const kinds = {
  'apps/api/src/a.ts': 'code',
  'apps/staff-web/src/A.tsx': 'code',
  'packages/shared/src/a.mjs': 'code',
  'tools/migrate/src/a.cjs': 'code',
  'e2e/tests/a.spec.ts': 'code',
  'docs/design/brand/tools/a.js': 'code',
  '.github/workflows/ci.yml': 'hash',
  '.github/actions/x/action.yaml': 'hash',
  '.github/scripts/a.sh': 'hash',
  'packages/db/supabase/migrations/1_a.sql': null,
  'packages/db/supabase/migrations/a.ts': null,
  'packages/db/src/types.ts': null,
  'apps/api/src/x.gen.ts': null,
  'apps/web/dist/a.js': null,
  'docs/03-requirements.md': null,
  'docs/design/a.ts': null,
  'packages/shared/i18n/ar.json': null,
};
for (const [path, kind] of Object.entries(kinds)) {
  test(`${path} is ${kind ?? 'out of scope'}`, () => assert.equal(scopeOf(path), kind));
}
