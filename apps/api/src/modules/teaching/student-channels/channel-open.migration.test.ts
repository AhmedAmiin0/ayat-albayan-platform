import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 971–972 (owner 2026-10-29, docs/31 §2), read as text: no database in unit tests.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const strip = (sql: string) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const open = strip(readFileSync(join(dir, '20261029000971_channel_after_subscribe.sql'), 'utf8'));
const assign = strip(readFileSync(join(dir, '20261029000972_assign_student_teacher.sql'), 'utf8'));
const body = (code: string, fn: string) => new RegExp(`function public\\.${fn}[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`).exec(code)?.[1] ?? '';

describe('migration 971: the channel opens after the subscription', () => {
  it('channel_is_open: a teacher assigned and the status past the trial', () => {
    const fn = body(open, 'channel_is_open');
    expect(fn).toContain('s.teacher_id is not null');
    expect(fn).toContain("s.status not in ('new', 'trial', 'pending_subscription')");
  });

  it('RLS: monitors always; the teacher and the family only on an open channel; a child login never', () => {
    const fn = body(open, 'can_read_channel');
    expect(fn).toMatch(/public\.is_admin\(\)\n\s+or \(public\.auth_role\(\) = 'sales'/);
    const gated = fn.slice(fn.indexOf('public.channel_is_open(c.student_id)'));
    for (const part of ["auth_role() = 'teacher'", "auth_role() = 'guardian'", "auth_role() = 'student'"]) expect(gated).toContain(part);
    expect(gated).toContain('s.profile_id = (select auth.uid()) and s.contact_is_self');
  });

  it('the teacher list keeps open channels only', () => {
    expect(body(open, 'teacher_channel_student_ids')).toContain('where public.channel_is_open(x.id)');
  });

  it('channel_messages joins supabase_realtime once, guarded (a stack without Realtime has no publication)', () => {
    expect(open).toContain("if exists (select 1 from pg_publication where pubname = 'supabase_realtime')");
    expect(open).toContain("tablename = 'channel_messages'");
    expect(open).toContain('alter publication supabase_realtime add table public.channel_messages;');
  });

  it('definer helpers with an empty search_path; nothing for anon; a rollback note', () => {
    expect([...open.matchAll(/security definer set search_path = ''/g)].length).toBe([...open.matchAll(/create or replace function/g)].length);
    expect(open).toContain('revoke execute on function public.channel_is_open(uuid) from public, anon, authenticated;');
    expect(readFileSync(join(dir, '20261029000971_channel_after_subscribe.sql'), 'utf8')).toContain('MANUAL ROLLBACK');
  });
});

describe('migration 972: assign_student_teacher', () => {
  it('an active teacher only, one audit row, nothing when unchanged; service role only', () => {
    const fn = body(assign, 'assign_student_teacher');
    expect(fn).toContain("t.status = 'active'");
    expect(fn).toContain('if v_before is not distinct from p_teacher then\n    return false;');
    // Unchanged before the active check: keeping an inactive trial teacher never fails the subscribe.
    expect(fn.indexOf('is not distinct from p_teacher')).toBeLessThan(fn.indexOf("t.status = 'active'"));
    expect(fn).toContain("'students', p_student, 'teacher_assign'");
    expect(assign).toContain('revoke execute on function public.assign_student_teacher(uuid, uuid, uuid) from public, anon, authenticated;');
    expect(assign).toContain('grant execute on function public.assign_student_teacher(uuid, uuid, uuid) to service_role;');
  });
});
