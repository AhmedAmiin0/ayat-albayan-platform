import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 981, read as text (no database in unit tests): the owner-rights family views lose the default
// write grants of `authenticated`, which bypassed the RLS of the tables under them (review authz-db-1).
const dir = MIGRATIONS_DIR;
const sql = readFileSync(join(dir, '20261030000981_portal_views_read_only.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const VIEWS = ['portal_students', 'portal_guardians', 'portal_lessons', 'portal_reports', 'portal_packages', 'portal_recordings', 'student_self'];

describe('migration 981: the family views are read-only', () => {
  it('revokes every write privilege of authenticated on each owner-rights family view', () => {
    const revoke = /revoke insert, update, delete, truncate, references, trigger\s+on ([\s\S]*?)\s+from authenticated;/.exec(code);
    const on = (revoke?.[1] ?? '').split(',').map((v) => v.trim());
    expect(on.sort()).toEqual(VIEWS.map((v) => `public.${v}`).sort());
  });

  it('keeps select, grants nothing back and writes no row', () => {
    expect(code).not.toMatch(/\bgrant\b/i);
    expect(code).not.toMatch(/\bselect\b/i);
    expect(code).not.toMatch(/\b(insert into|update public|delete from)\b/i);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
