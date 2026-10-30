import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 790 (docs/31), read as text: no database in unit tests (checked against a local stack when written).
const dir = MIGRATIONS_DIR;
const sql = readFileSync(join(dir, '20261027000790_portal_scope.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const view = (name: string) => new RegExp(`create or replace view public\\.${name} with \\(security_invoker = false\\) as([\\s\\S]*?);`).exec(code)?.[1] ?? '';
const SECRET = /price|currency|fx_|price_source|notes|source|created_by|cancel_reason|override_reason|attendance|meeting_link|phone|egress|file_path|pdf_path/;

describe('migration 790: the portal second wall', () => {
  it('one scope: a student login itself, a guardian login its students, by auth_role (null when disabled)', () => {
    expect(code).toContain("public.auth_role() = 'student' and s.profile_id = (select auth.uid())");
    expect(code).toContain("public.auth_role() = 'guardian'");
    expect(code).toContain('grant execute on function public.portal_student_ids() to authenticated, service_role;');
  });

  it('drops every whole-row guardian policy (notes, reasons, prices, payments)', () => {
    for (const p of ['students_guardian_read', 'lessons_guardian_read', 'lesson_students_guardian_read', 'lesson_reports_guardian_read', 'report_attachments_guardian_read', 'subscriptions_guardian_read', 'payments_guardian_read', 'storage_reports_guardian_read', 'storage_attachments_guardian_read', 'guardians_self_read']) {
      expect(code).toContain(`drop policy if exists ${p} on`);
    }
    expect(code).not.toMatch(/create policy \w+ on public\./);
    for (const fn of ['my_student_ids()', 'is_my_child_lesson(uuid)', 'is_my_child_report(uuid)', 'is_my_child_report_pdf(text)']) {
      expect(code).toContain(`revoke execute on function public.${fn} from public, anon, authenticated;`);
    }
  });

  it('the views are whitelists filtered by the scope, never money or internal columns', () => {
    for (const name of ['portal_students', 'portal_guardians', 'portal_lessons', 'portal_reports', 'portal_packages', 'portal_recordings']) {
      const body = view(name);
      expect([name, body.includes(name === 'portal_guardians' ? 'g.profile_id = (select auth.uid())' : 'public.portal_student_ids()')]).toEqual([name, true]);
      expect([name, body.split(/\bfrom\b/)[0]?.match(SECRET)?.[0] ?? null]).toEqual([name, null]);
    }
    expect(view('portal_recordings')).toContain('r.visible_to_student');
    expect(view('portal_recordings')).toMatch(/count\(\*\)[\s\S]*= 1/);
    expect(view('portal_reports')).toContain('r.sent_at is not null');
    expect(code).toMatch(/revoke all on public\.portal_students[\s\S]*from public, anon;/);
  });

  it('the API scope function is service role only; the storage policy reads sent reports of the scope', () => {
    expect(code).toContain('revoke execute on function public.portal_students_of(uuid) from public, anon, authenticated;');
    expect(code).toContain('pr.disabled_at is null');
    expect(code).toMatch(/is_portal_report_pdf[\s\S]*r\.sent_at is not null and r\.pdf_status = 'ready'/);
    expect(code).toContain("create policy storage_reports_portal_read on storage.objects for select to authenticated\n  using (bucket_id = 'reports' and public.is_portal_report_pdf(name));");
  });

  it('writes no row and says how to roll back', () => {
    expect(code).not.toMatch(/\b(insert into|update public|delete from)\b/i);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
