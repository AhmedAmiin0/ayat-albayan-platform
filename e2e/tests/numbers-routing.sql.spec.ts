import { expect, test } from '@playwright/test';
import { USERS } from '../support/users';
import { as, rolledBack, userId, type Tx } from '../support/rls';

// Migration 20261024000633 (docs/23 §3 phase 5, docs/23c): per-(phone, number) reply windows in
// v_thread_numbers, per-number template approvals in message_template_numbers. Real database, rolled back.

async function number(tx: Tx, phoneNumberId: string): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.wa_numbers (label, purpose, phone_number_id)
    values ('e2e routing', 'chat', ${phoneNumberId}) returning id`;
  if (!row) throw new Error('no number');
  return row.id;
}

test.describe('routing per number (migration 633)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('v_thread_numbers: newest inbound per (phone, number); outbound and unstamped rows never count', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000931';
      const a = await number(tx, 'e2e-route-a');
      const b = await number(tx, 'e2e-route-b');
      for (const [dir, id, mins] of [['inbound', a, 30], ['inbound', a, 20], ['inbound', b, 50], ['outbound', b, 1], ['inbound', null, 2]] as const) {
        await tx`insert into public.messages (direction, phone_e164, body, number_id, created_at)
          values (${dir}, ${phone}, 'e2e routing', ${id}, now() - make_interval(mins => ${mins}))`;
      }
      const rows = await tx<{ number_id: string; mins: number }[]>`
        select number_id, round(extract(epoch from now() - last_inbound_at) / 60)::int as mins
        from public.v_thread_numbers where phone_e164 = ${phone} order by mins`;
      expect(rows).toEqual([{ number_id: a, mins: 20 }, { number_id: b, mins: 50 }]);
    });
  });

  test('message_template_numbers: the admin reads, cannot write; a deleted number drops its approvals', async () => {
    await rolledBack(async (tx) => {
      const id = await number(tx, 'e2e-route-c');
      const [tpl] = await tx<{ key: string }[]>`select key from public.message_templates order by key limit 1`;
      if (!tpl) throw new Error('no template');
      await tx`insert into public.message_template_numbers (template_key, number_id, status) values (${tpl.key}, ${id}, 'approved')`;
      const admin = await userId(tx, USERS.admin.email);
      const seen = await as(tx, admin, () => tx`select status from public.message_template_numbers where number_id = ${id}`);
      expect(seen.length).toBe(1);
      await tx`savepoint w`;
      await expect(as(tx, admin, () => tx`update public.message_template_numbers set status = 'rejected' where number_id = ${id}`)).rejects.toThrow();
      await tx`rollback to savepoint w`;
      await tx`delete from public.wa_numbers where id = ${id}`;
      const [left] = await tx<{ n: number }[]>`select count(*)::int as n from public.message_template_numbers where number_id = ${id}`;
      expect(left?.n).toBe(0);
    });
  });
});
