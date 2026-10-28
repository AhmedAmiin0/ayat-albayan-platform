import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GOOGLE_SKIP_REASONS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 20261028000943 (the per-teacher calendar handover, docs/24) read as text: no database in unit tests.
const sql = readFileSync(join(__dirname, '../../../../../../packages/db/supabase/migrations/20261028000943_teacher_calendar_owner.sql'), 'utf8');
const fn = (name: string) => new RegExp(`function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`).exec(sql)?.[0] ?? '';

describe('migration 20261028000943: teachers.calendar_owner', () => {
  it("expand-only: defaults to 'script' (nothing changes on deploy), checked to script / platform", () => {
    expect(sql).toContain("add column if not exists calendar_owner text not null default 'script'");
    expect(sql).toContain("check (calendar_owner in ('script', 'platform'))");
    expect(sql).toMatch(/calendar_owner_changed_at timestamptz/);
    expect(sql).toMatch(/calendar_owner_changed_by uuid null references auth\.users/);
    expect(sql.replace(/--[^\n]*/g, '')).not.toMatch(/drop (column|table)|alter column/i);
  });

  it('only an admin changes it; every change is stamped and audited', () => {
    const guard = fn('teachers_calendar_owner_guard');
    expect(guard).toContain("(select auth.role()) = 'authenticated' and not public.is_admin()");
    expect(guard).toContain('new.calendar_owner_changed_at := now()');
    expect(guard).toContain("insert into public.audit_log");
    expect(sql).toContain('before update of calendar_owner on public.teachers');
  });

  it('a lesson is calendar-managed when platform-origin OR its teacher is platform-owned', () => {
    expect(sql).toContain('exists (select 1 from public.v_platform_origin_lessons v where v.id = l.id)');
    expect(sql).toContain("t.id = l.teacher_id and t.calendar_owner = 'platform'");
    expect(fn('google_sync_enqueue_lesson')).toContain('public.v_calendar_managed_lessons');
    expect(fn('google_sync_reconcile')).toContain('public.v_calendar_managed_lessons');
  });

  it('switching the owner queues that teacher\'s open lessons and every lesson with one of our events', () => {
    expect(sql).toContain('after update of calendar_owner on public.teachers');
    expect(sql).toContain('when (old.calendar_owner is distinct from new.calendar_owner)');
    const teacher = fn('google_sync_enqueue_teacher');
    expect(teacher).toContain('x.teacher_id = p_teacher_id');
    expect(teacher).toContain('i.google_id is not null');
    expect(teacher).toContain('public.google_sync_enqueue_lesson(l.id, false)');
  });

  it('the skip reasons in the DB check match the shared list', () => {
    const check = /google_sync_items_skip_reason_check check \(skip_reason in \(([\s\S]*?)\)\)/.exec(sql)?.[1] ?? '';
    expect([...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()).toEqual([...GOOGLE_SKIP_REASONS].sort());
  });

  it('every new function is service-role only', () => {
    expect(sql).toContain("'google_teacher_calendar_counts(uuid)'");
    expect(sql).toContain("execute format('revoke execute on function public.%s from public, anon, authenticated', f)");
  });
});
