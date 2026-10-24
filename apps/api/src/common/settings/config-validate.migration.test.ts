import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 634 (docs/26 §4 «Validate»): validates the three checks migration 630 added NOT VALID.
// No database in unit tests; e2e/tests/config-expand.sql.spec.ts checks the result against Postgres.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261024000634_config_validate.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('migration 634: config validate', () => {
  it('validates exactly the three checks 630 added NOT VALID', () => {
    for (const name of ['settings_key_format', 'settings_value_size', 'settings_kind']) {
      expect(code).toContain(`'${name}'`);
    }
    expect(code).toContain('and not convalidated');
    expect(code).toContain("format('alter table public.settings validate constraint %I', c)");
  });

  it('keeps a check NOT VALID with a warning instead of failing the deploy on a bad row', () => {
    expect(code).toMatch(/exception when check_violation then\s+raise warning/);
  });

  it('writes no settings row and adds or drops no constraint', () => {
    expect(code).not.toMatch(/\b(insert\s+into|update|delete\s+from|merge\s+into|truncate)\b/i);
    expect(code).not.toMatch(/\b(add|drop)\s+constraint\b/i);
  });
});
