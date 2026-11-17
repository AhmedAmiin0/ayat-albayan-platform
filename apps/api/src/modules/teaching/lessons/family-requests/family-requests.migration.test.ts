import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261117100100 (owner 2026-11-17). No database runs in unit tests: this pins its shape.
const dir = join(__dirname, '../../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261117100100_family_lesson_requests.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
const view = code.slice(code.indexOf('view public.portal_lesson_requests'), code.indexOf('revoke all'));

describe('migration 20261117100100: the family requests', () => {
  it('adds the requester and the answer note re-runnably; the new enum values only added', () => {
    expect(code).toContain("add column if not exists requested_by text not null default 'teacher'");
    expect(code).toContain('add column if not exists decision_note text');
    expect(code).toContain("check (requested_by in ('teacher', 'family'))");
    expect(code).toContain("alter type public.proposal_status add value if not exists 'withdrawn'");
    expect(code).toContain("alter type public.push_kind add value if not exists 'lesson_request_declined'");
  });

  it("a portal login sees its own students' family requests only, without staff or teacher ids", () => {
    expect(view).toContain('security_invoker = false');
    expect(view).toContain("p.requested_by = 'family'");
    expect(view).toContain('ls.student_id in (select public.portal_student_ids())');
    expect(view).not.toMatch(/teacher_id|decided_by|created_by/);
    expect(code).toContain('revoke all on public.portal_lesson_requests from public, anon');
  });

  it("the owning assistant reads her families' requests (RLS)", () => {
    expect(code).toContain('create policy lesson_proposals_sales_read on public.lesson_proposals');
    expect(code).toContain("using (requested_by = 'family' and public.is_my_sales_lesson(lesson_id))");
  });
});
