import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261117090100 read as text: a student's own WhatsApp number.
const sql = readFileSync(migrationPath('20261117090100_student_own_phone.sql'), 'utf8');
const flat = sql.replace(/\s+/g, ' ');

describe("migration 20261117090100: a student's own number in guardian_phones", () => {
  it('a unique student_id (cascading with the student), never a main number', () => {
    expect(sql).toContain("set local lock_timeout = '5s';");
    expect(flat).toContain('add column if not exists student_id uuid');
    expect(flat).toContain('constraint guardian_phones_student_id_key unique');
    expect(flat).toContain(
      'constraint guardian_phones_student_id_fkey references public.students (id) on delete cascade',
    );
    expect(flat).toContain('check (student_id is null or not is_primary)');
  });

  it('keeps one SECOND number per family under the same index name', () => {
    expect(flat).toContain(
      'create unique index guardian_phones_one_second on public.guardian_phones (guardian_id) where not is_primary and student_id is null;',
    );
  });

  it("a main-number change and the family's DELETE never touch a student's number", () => {
    expect(flat).toContain('(is_primary or (phone_e164 = new.phone_e164 and student_id is null))');
    expect(flat).toContain('and not gp.is_primary and gp.student_id is null');
  });

  it('set_student_phone: definer, empty search_path, the service role only, audited', () => {
    expect(flat).toContain(
      'create or replace function public.set_student_phone(p_student uuid, p_actor uuid, p_phone text default null)',
    );
    expect(flat).toContain("language plpgsql security definer set search_path = ''");
    expect(flat).toContain('for update;');
    expect(flat).toContain("'student_phone'");
    expect(flat).toContain(
      'revoke execute on function public.set_student_phone(uuid, uuid, text) from public, anon, authenticated;',
    );
    expect(flat).toContain(
      'grant execute on function public.set_student_phone(uuid, uuid, text) to service_role;',
    );
  });

  it('the number follows the student to another family', () => {
    expect(flat).toContain('after update of guardian_id on public.students');
    expect(flat).toContain('update public.guardian_phones set guardian_id = new.guardian_id');
  });

  it('a merge moves the number only while the kept student has none, with the kept family', () => {
    expect(flat).toContain(
      'before update of student_id on public.guardian_phones for each row when (old.student_id is distinct from new.student_id and new.student_id is not null)',
    );
    expect(flat).toContain('where gp.student_id = new.student_id) then');
    expect(flat).toContain('return null;');
    expect(flat).toContain(
      'select s.guardian_id into new.guardian_id from public.students s where s.id = new.student_id;',
    );
    expect(flat).toContain("'merged_into'");
    expect(flat).toContain("'merged_from'");
    expect(flat).toContain(
      'revoke all on function public.guardian_phones_student_moved() from public, anon, authenticated;',
    );
  });

  it('a number that stops opening a login signs that login out', () => {
    expect(flat).toContain(
      'perform public.revoke_user_sessions(v_login) where v_before is not null and v_login is not null;',
    );
    expect(flat).toContain(
      'perform public.revoke_user_sessions(g.profile_id) from public.guardians g where g.id = p_guardian and g.profile_id is not null;',
    );
  });

  it('no new policy and no grant to authenticated (reads stay admin + family assistant)', () => {
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/grant [a-z, ]+ to authenticated/i);
  });
});
