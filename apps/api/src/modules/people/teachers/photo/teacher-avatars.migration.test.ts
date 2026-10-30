import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261028000944 read as text (no database in unit tests; CI's e2e job applies it).

const sql = readFileSync(migrationPath('20261028000944_teacher_avatars.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261028000944 teacher avatars', () => {
  it('adds a nullable teachers.avatar_path, idempotently and expand-only', () => {
    expect(code).toMatch(/alter table public\.teachers add column if not exists avatar_path text;/);
    expect(code).not.toMatch(/\bdrop (table|column)\b|not null|default/i);
    expect(code).toMatch(/set local lock_timeout/);
  });

  it('accepts only a path in the teacher’s own folder', () => {
    expect(code).toMatch(/drop constraint if exists teachers_avatar_path_own/);
    expect(code).toMatch(/split_part\(avatar_path, '\/', 1\) = 'teachers'/);
    expect(code).toMatch(/split_part\(avatar_path, '\/', 2\) = id::text/);
    expect(code).toMatch(/char_length\(avatar_path\) between 1 and 200/);
  });

  it('opens no bucket and adds no policy (admin-only writes stay teachers_admin; the API is the service role)', () => {
    expect(code).not.toMatch(/storage\.buckets|create policy|grant /);
  });
});
