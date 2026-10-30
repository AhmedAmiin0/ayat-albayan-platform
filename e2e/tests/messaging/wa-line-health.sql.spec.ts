import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/rls';
import { USERS } from '../../support/users';

// Migration 20261022000600 (docs/23 phase 1): the last good line check per line. Admins read it,
// only the service role writes, anon sees nothing; numbers must be E.164. Every test rolls back.

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
const clearClaims = (tx: Tx) => tx`select set_config('request.jwt.claims', '', true)`;
async function seed(tx: Tx): Promise<void> {
  await tx`delete from public.wa_line_health`;
  await tx`insert into public.wa_line_health (line, display_phone_e164, checked_at) values ('notifications', '+15550001111', now())`;
}

test.describe('wa_line_health (migration 600)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('an admin reads it; a teacher reads nothing; no client session writes; anon is refused', async () => {
    await rolledBack(async (tx) => {
      await seed(tx);
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const rows = (uid: string) => as(tx, uid, () => tx<{ line: string }[]>`select line from public.wa_line_health`);
      expect(await rows(teacher)).toEqual([]);
      await clearClaims(tx);
      expect((await rows(admin)).map((r) => r.line)).toEqual(['notifications']);
      await clearClaims(tx);
      const write = () => as(tx, admin, () => tx`update public.wa_line_health set verified_name = 'x'`);
      expect(await code(tx, write)).toBe('42501');
      await clearClaims(tx);
      const anon = async () => {
        await tx`set local role anon`;
        return tx`select line from public.wa_line_health`;
      };
      expect(await code(tx, anon)).toBe('42501');
    });
  });

  test('one row per line, numbers in E.164 only', async () => {
    await rolledBack(async (tx) => {
      await seed(tx);
      const insert = (phone: string) => () =>
        tx`insert into public.wa_line_health (line, display_phone_e164, checked_at) values ('chat', ${phone}, now())`;
      expect(await code(tx, insert('+966 55 123 4567'))).toBe('23514');
      expect(await code(tx, insert('0551234567'))).toBe('23514');
      expect(await code(tx, () => tx`insert into public.wa_line_health (line, checked_at) values ('notifications', now())`)).toBe('23505');
      expect(await code(tx, insert('+966551234567'))).toBe('ok');
    });
  });
});
