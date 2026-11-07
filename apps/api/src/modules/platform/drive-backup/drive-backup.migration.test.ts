import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261107000200 read as text (no database in unit tests).
const sql = readFileSync(join(MIGRATIONS_DIR, '20261107000200_drive_backup.sql'), 'utf8');

describe('migration 20261107000200: the Drive backup tables', () => {
  it('RLS on all three, admin read only, no client writes', () => {
    expect(sql).toContain(
      "array['drive_backup_state', 'drive_backup_archives', 'drive_backup_objects']",
    );
    expect(sql).toContain("'alter table public.%I enable row level security'");
    expect(sql).toContain(
      "'revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated'",
    );
    expect(sql).toContain('using ((select public.is_admin()))');
  });

  it('one row per archive part per folder; objects go with their archive', () => {
    expect(sql).toContain('unique (folder_id, kind, label, part)');
    expect(sql).toContain('references public.drive_backup_archives (id) on delete cascade');
    expect(sql).toContain('primary key (archive_id, bucket, key)');
  });

  it('the frozen status (a full open for more than 3 nights) and its reasons', () => {
    expect(sql).toContain('frozen_since timestamptz');
    expect(sql).toContain(
      "check (frozen_reason in ('too_large', 'drive_full', 'unread', 'incomplete', 'failed'))",
    );
  });
});
