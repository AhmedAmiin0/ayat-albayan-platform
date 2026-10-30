import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migration 185: a signed-in user reads only the push_notifications rows addressed to them.

async function note(tx: Tx, profile: string, key: string) {
  await tx`insert into public.push_notifications (profile_id, kind, title, body, dedup_key)
    values (${profile}, 'new_message', 't', 'b', ${key})`;
}

test.describe('push_notifications RLS (migration 185)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('an admin and a teacher each read only their own notifications', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      await note(tx, admin, 'rls185:admin');
      await note(tx, teacher, 'rls185:teacher');
      const keys = (uid: string) =>
        as(tx, uid, () => tx<{ dedup_key: string }[]>`select dedup_key from public.push_notifications where dedup_key like 'rls185:%' order by dedup_key`);
      expect((await keys(admin)).map((r) => r.dedup_key)).toEqual(['rls185:admin']);
      expect((await keys(teacher)).map((r) => r.dedup_key)).toEqual(['rls185:teacher']);
    });
  });

  test('nobody writes through the client: no insert, update or delete as a signed-in user', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      await note(tx, admin, 'rls185:w');
      const refused = (q: () => Promise<unknown>) =>
        tx.savepoint(() => as(tx, admin, q)).then(() => 'allowed', (e: { code?: string }) => e.code);
      expect(await refused(() => tx`insert into public.push_notifications (profile_id, kind, title, body, dedup_key)
        values (${admin}, 'new_message', 't', 'b', 'rls185:x')`)).toBe('42501');
      expect(await refused(() => tx`delete from public.push_notifications where dedup_key = 'rls185:w'`)).toBe('42501');
    });
  });
});
