import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 289 renames the sales role's label back to «المبيعات» / 'Sales' (owner, 2026-10-11);
// the classroom assistant keeps the label migration 274 gave it.
const MIGRATIONS = MIGRATIONS_DIR;
const read = (file: string): string => readFileSync(join(MIGRATIONS, file), 'utf8');
const LABEL = /update public\.roles set name_ar = '([^']*)', name_en = '([^']*)' where is_system and key = '([a-z]+)';/g;

function labels(sql: string): Map<string, [string, string]> {
  return new Map([...sql.matchAll(LABEL)].map((m) => [m[3] ?? '', [m[1] ?? '', m[2] ?? '']]));
}

describe('migration 20261006000289 sales role label', () => {
  const sql = read('20261006000289_sales_role_label.sql');

  it('shows the sales role as Sales', () => {
    expect(labels(sql).get('sales')).toEqual(['المبيعات', 'Sales']);
  });

  it('leaves the classroom assistant as migration 274 named it', () => {
    expect(labels(sql).has('assistant')).toBe(false);
    expect(labels(read('20261006000274_assistant_scope_roles.sql')).get('assistant')).toEqual(['مساعد حلقة', 'Classroom assistant']);
  });
});
