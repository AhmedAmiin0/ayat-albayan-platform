import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261106001401, read as text: no database here.
const sql = readFileSync(migrationPath('20261106001401_report_view_codes.sql'), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

describe("migration 901: login_codes take the report page's codes", () => {
  it('widens the purpose and subject checks only, keeping every earlier value', () => {
    expect(sql).toContain(
      "check (purpose in ('sign_in', 'reset_password', 'set_password', 'report_view'))",
    );
    expect(sql).toContain("check (subject_kind in ('guardian', 'student', 'profile', 'report'))");
    expect(sql.match(/validate constraint/g)).toHaveLength(2);
    expect(sql).not.toMatch(/drop table|delete from|update public\.|disable row level/i);
  });
});
