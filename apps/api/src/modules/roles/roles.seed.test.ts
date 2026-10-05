import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultGrantsOf, isGrantable } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// The migration seeds the system roles' grants by hand; this keeps it equal to the catalog
// (packages/shared defaultGrantsOf), which the parity test proves equal to the old @Roles table.
const SQL = readFileSync(
  join(__dirname, '../../../../../packages/db/supabase/migrations/20261005000220_roles_permissions.sql'),
  'utf8',
);

function seeded(key: string): string[] {
  const block = SQL.match(new RegExp(`\\('${key}', array\\[([^\\]]*)\\]\\)`));
  return block?.[1] ? [...block[1].matchAll(/'([a-z_.]+)'/g)].map((m) => m[1] ?? '') : [];
}

describe('migration 20261005000220 seed', () => {
  it.each(['admin', 'teacher', 'assistant', 'sales'] as const)('%s gets exactly its catalog grants', (key) => {
    expect(seeded(key)).toEqual(defaultGrantsOf(key));
  });

  it('seeds nothing for guardians and only grantable keys', () => {
    expect(seeded('guardian')).toEqual([]);
    for (const key of ['admin', 'teacher', 'assistant', 'sales']) expect(seeded(key).every(isGrantable)).toBe(true);
  });
});
