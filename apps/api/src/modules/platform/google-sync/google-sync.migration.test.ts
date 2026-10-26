import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migrations 20261022000610–612 (docs/24) read as text: no database in unit tests (the SQL behaviour is in
// e2e/tests/google-sync.sql.spec.ts).
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const read = (f: string) => readFileSync(join(dir, f), 'utf8');
const tables = read('20261022000610_google_sync.sql');
const outbox = read('20261022000611_google_sync_outbox.sql');

describe('migration 20261022000610: Google sync tables', () => {
  it('integration_secret_key_ok lists exactly the shared secret keys, the Google client secret included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(tables)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    // The CRM keys came later (migration 20261025000640, wacrm-driver.migration.test.ts).
    expect(listed.sort()).toEqual(INTEGRATION_SECRET_KEYS.filter((k) => !k.startsWith('WACRM_') && !k.startsWith('CALLS_')).sort());
  });

  it('RLS on every new table, admin read only, no client writes', () => {
    expect(tables).toContain("foreach t in array array['google_account', 'google_teacher_calendars', 'google_student_files', 'google_sync_items']");
    expect(tables).toContain("'alter table public.%I enable row level security'");
    expect(tables).toContain("'revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated'");
    expect(tables).toContain('using (public.is_admin())');
  });

  it('defaults OFF and dry_run; the outbox is unique per (kind, subject)', () => {
    expect(tables).toContain("('google_sync_enabled', 'false'::jsonb)");
    expect(tables).toContain(`('google_sync_mode', '"dry_run"'::jsonb)`);
    expect(tables).toContain('unique (kind, subject_id)');
  });

  it('the refresh token functions are service-role only', () => {
    for (const f of ['google_token_set(text)', 'google_token_read()', 'google_token_clear()']) {
      expect(tables).toContain(`revoke execute on function public.${f} from public, anon, authenticated;`);
      expect(tables).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });
});

describe('migration 20261022000611: the platform-origin predicate and the producers', () => {
  it('excludes imported lessons AND lessons generated from an imported rule', () => {
    expect(outbox).toMatch(/i\.target_table = 'lessons' and i\.target_id = l\.id/);
    expect(outbox).toMatch(/i\.target_table = 'schedule_rules' and i\.target_id = l\.rule_id/);
  });

  it('never exports an imported report; queues nothing while sync is off', () => {
    expect(outbox).toMatch(/i\.target_table = 'lesson_reports' and i\.target_id = p_report_id/);
    expect(outbox).toContain('if public.google_sync_on() then perform public.google_sync_enqueue_lesson(new.id, true)');
  });
});
