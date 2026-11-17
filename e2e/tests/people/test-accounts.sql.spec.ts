import { expect, test } from '@playwright/test';
import { as, rolledBack, userId } from '../../support/core/rls';
import { USERS } from '../../support/core/users';
import { code, flagOf, flip, household, login } from '../../support/people/test-accounts';

// Test accounts (migration 20261117140100, docs/56): only the API writes is_test, and a test family
// login links only to test students (a real one only to real students). Rolled back.

test.describe('test accounts (20261117140100)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a signed-in user cannot set is_test, on itself or on a student', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const fam = await household(tx, '+966500000931');
      const run = (q: () => Promise<unknown>) => code(tx, () => as(tx, admin, q));
      expect(await run(() => tx`update public.profiles set is_test = true where id = ${admin}`))
        .toBe('42501');
      expect(await run(() => tx`update public.students set is_test = true
        where id = ${fam.student}`)).toBe('42501');
      await tx`select set_config('request.jwt.claims', '', true)`;
      expect(await flagOf(tx, 'profiles', admin)).toBe(false);
      expect(await flagOf(tx, 'students', fam.student)).toBe(false);
    });
  });

  test('the admin switch flips the whole family with one audit row', async () => {
    await rolledBack(async (tx) => {
      await tx`set constraints all immediate`;
      const fam = await household(tx, '+966500000932');
      const parent = await login(tx, 'test-parent-a', 'guardian');
      await tx`update public.guardians set profile_id = ${parent} where id = ${fam.guardian}`;
      await flip(tx, { kind: 'student', id: fam.student, on: true });
      expect(await flagOf(tx, 'students', fam.student)).toBe(true);
      expect(await flagOf(tx, 'profiles', parent)).toBe(true);
      const audit = await tx<{ n: number }[]>`select count(*)::int n from public.audit_log
        where entity_id = ${fam.student} and action = 'test_flag'`;
      expect(audit[0]?.n).toBe(1);
    });
  });

  test('a mixed family link is refused: test login with a real student, and the reverse', async () => {
    await rolledBack(async (tx) => {
      await tx`set constraints all immediate`;
      const testFam = await household(tx, '+966500000933');
      const realFam = await household(tx, '+966500000934');
      const parent = await login(tx, 'test-parent-b', 'guardian');
      await tx`update public.guardians set profile_id = ${parent} where id = ${testFam.guardian}`;
      await flip(tx, { kind: 'profile', id: parent, on: true });
      // A real student moved under the test login's guardian.
      expect(await code(tx, () => tx`update public.students set guardian_id = ${testFam.guardian}
        where id = ${realFam.student}`)).toBe('23514');
      // The test login (already linked) as a real student's own login.
      expect(await code(tx, () => tx`update public.students set profile_id = ${parent}
        where id = ${realFam.student}`)).toBe('23514');
      // The login turned real while its student stays test.
      expect(await code(tx, () => tx`update public.profiles set is_test = false
        where id = ${parent}`)).toBe('23514');
      // The student turned real while its guardian's login stays test.
      expect(await code(tx, () => tx`update public.students set is_test = false
        where id = ${testFam.student}`)).toBe('23514');
      expect(await flagOf(tx, 'students', realFam.student)).toBe(false);
    });
  });

  test('a new login takes its family flag; a new child takes the login flag', async () => {
    await rolledBack(async (tx) => {
      await tx`set constraints all immediate`;
      const fam = await household(tx, '+966500000935');
      await flip(tx, { kind: 'student', id: fam.student, on: true });
      const parent = await login(tx, 'test-parent-c', 'guardian');
      await tx`update public.guardians set profile_id = ${parent} where id = ${fam.guardian}`;
      expect(await flagOf(tx, 'profiles', parent)).toBe(true);
      const [kid] = await tx<{ id: string }[]>`insert into public.students
          (guardian_id, name, name_normalized, tz)
        values (${fam.guardian}, 'أخ', 'اخ', 'Asia/Riyadh') returning id`;
      expect(await flagOf(tx, 'students', kid?.id ?? '')).toBe(true);
    });
  });
});
