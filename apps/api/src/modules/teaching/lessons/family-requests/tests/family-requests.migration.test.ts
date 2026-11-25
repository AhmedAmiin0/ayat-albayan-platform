import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261117150100 (owner 2026-11-17). No database runs in unit tests: this pins its shape.
const sql = readFileSync(join(MIGRATIONS_DIR, '20261117150100_family_lesson_requests.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');

describe('migration 20261117150100: the family requests', () => {
  it('adds the requester and the answer note re-runnably; the new enum values only added', () => {
    expect(code).toContain("add column if not exists requested_by text not null default 'teacher'");
    expect(code).toContain('add column if not exists decision_note text');
    expect(code).toContain("check (requested_by in ('teacher', 'family'))");
    expect(code).toContain("alter type public.proposal_status add value if not exists 'withdrawn'");
    expect(code).toContain("alter type public.push_kind add value if not exists 'lesson_request_declined'");
  });

  it('no portal view: a portal login reads its own requests through the API only', () => {
    expect(code).not.toContain('portal_lesson_requests');
    expect(code).not.toContain('security_invoker');
  });

  it("the owning assistant reads her families' requests (RLS)", () => {
    expect(code).toContain('create policy lesson_proposals_sales_read on public.lesson_proposals');
    expect(code).toContain("using (requested_by = 'family' and public.is_my_sales_lesson(lesson_id))");
  });
});
