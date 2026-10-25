import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Trial students: no direct teacher ↔ family chat (owner, 2026-10-11). The scope lives in SQL
// (teacher_thread_phones); no database runs in unit tests, so this pins the migration's shape.
const root = join(__dirname, '../../../../../..');
const dir = join(root, 'packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261007000001_trial_no_teacher_chat.sql'), 'utf8');
const body = sql.slice(sql.indexOf('$$'), sql.lastIndexOf('$$'));
const [guardians = '', own = ''] = body.split(/\bunion\b/);

describe('migration 20261007000001: trial families leave the teacher chat scope', () => {
  it('redefines teacher_thread_phones with the same signature, security definer and search_path', () => {
    expect(sql).toContain('create or replace function public.teacher_thread_phones(p_teacher_id uuid)');
    expect(sql).toContain('returns table (phone_e164 text)');
    expect(sql).toContain("language sql stable security definer set search_path = ''");
  });

  it('a guardian comes in only through a non-trial student of mine (a mixed family stays)', () => {
    expect(guardians).toContain('public.teacher_student_ids(p_teacher_id)');
    expect(guardians).toContain("s.status <> 'trial'");
    // Filtered per student row, not per guardian: no «not exists trial child» exclusion.
    expect(guardians).not.toMatch(/not\s+exists/i);
  });

  it("keeps the teacher's own number, unfiltered", () => {
    expect(own).toContain('t.id = p_teacher_id and t.phone_e164 is not null');
    expect(own).not.toContain('trial');
  });

  it('keeps execute for the service role only', () => {
    expect(sql).toContain('revoke execute on function public.teacher_thread_phones(uuid) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.teacher_thread_phones(uuid) to service_role;');
  });

  it('leaves teacher_student_ids (lessons, schedules, reports) untouched', () => {
    expect(sql).not.toMatch(/function\s+public\.teacher_student_ids/);
  });
});
