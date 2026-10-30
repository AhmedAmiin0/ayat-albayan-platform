import { expect, test } from '@playwright/test';
import { as, rolledBack, userId } from '../../support/rls';
import { USERS } from '../../support/users';

// The family views are read-only (migration 981, review authz-db-1): portal_* and student_self are owner-rights
// views (they bypass the RLS of the tables under them), so `authenticated` keeps SELECT only. Read from the
// database's own privileges, so a later migration that drops and creates a view again (Supabase's default
// write grants come back) fails here. Rolled back; database only.

const VIEWS = ['portal_students', 'portal_guardians', 'portal_lessons', 'portal_reports', 'portal_packages', 'portal_recordings', 'student_self'];

test.describe('family views in the database (migration 981)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('authenticated reads the seven views and writes none; an update through one is refused (42501)', async () => {
    await rolledBack(async (tx) => {
      for (const view of VIEWS) {
        const rel = `public.${view}`;
        const [grants] = await tx<{ sel: boolean; ins: boolean; upd: boolean; del: boolean }[]>`select
          has_table_privilege('authenticated', ${rel}::text, 'select') as sel,
          has_table_privilege('authenticated', ${rel}::text, 'insert') as ins,
          has_table_privilege('authenticated', ${rel}::text, 'update') as upd,
          has_table_privilege('authenticated', ${rel}::text, 'delete') as del`;
        expect(grants, view).toEqual({ sel: true, ins: false, upd: false, del: false });
      }
      const teacher = await userId(tx, USERS.teacher.email);
      const code = await tx
        .savepoint((sp) => as(sp, teacher, () => sp`update public.portal_packages set lessons_total = lessons_total + 1`))
        .then(() => 'ok', (e: { code?: string }) => e.code);
      expect(code).toBe('42501');
    });
  });
});
