import { expect, test } from '@playwright/test';
import { assistant } from '../../support/sales/assistant';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migration 20261028000860: messages broadcast ONE phone-only 'thread_changed' per phone per statement
// on the private topic 'inbox:staff'; only admin / sales with inbox.read may join it. The e2e stack runs
// without the Realtime service (its schema belongs to supabase_admin), so the sender
// public.inbox_live_send is replaced inside the rolled-back transaction by one that records what the
// trigger hands it, and the policy's rule is read through its helper, public.inbox_live_reader().

const A = '+966500000861';
const B = '+966500000862';

/** Records each call of the sender (one array of phones per statement). */
async function captureSends(tx: Tx): Promise<() => Promise<string[][]>> {
  await tx.unsafe(`create temp table live_sent (id serial, phones text[]) on commit drop;
    create or replace function public.inbox_live_send(p_phones text[]) returns void
      language sql set search_path = '' as $$ insert into pg_temp.live_sent (phones) values (p_phones) $$;`);
  return async () =>
    (await tx<{ phones: string[] }[]>`select phones from pg_temp.live_sent order by id`).map((r) => [...r.phones].sort());
}

async function profile(tx: Tx, input: { tag: string; role: string; roleId?: string }): Promise<string> {
  const [u] = await tx<{ id: string }[]>`insert into auth.users (id, email)
    values (gen_random_uuid(), ${`${input.tag}@e2e.local`}) returning id`;
  if (!u) throw new Error('auth user not written');
  await tx`insert into public.profiles (id, role, role_id, full_name)
    values (${u.id}, ${input.role}::public.user_role, ${input.roleId ?? null}, ${input.tag})`;
  return u.id;
}

test.describe('inbox realtime broadcast (20261028000860)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('one send per statement with each phone once; an update (a tick, a read mark) sends too', async () => {
    await rolledBack(async (tx) => {
      const sends = await captureSends(tx);
      await tx`insert into public.messages (direction, phone_e164, body) values
        ('inbound', ${A}, 'one'), ('inbound', ${A}, 'two'), ('outbound', ${B}, 'three')`;
      expect(await sends()).toEqual([[A, B]]);
      await tx`update public.messages set status = 'delivered' where phone_e164 = ${A}`;
      await tx`update public.messages set read_at = now() where phone_e164 = ${B}`;
      expect(await sends()).toEqual([[A, B], [A], [B]]);
      await tx`update public.messages set read_at = now() where false`;
      expect(await sends()).toHaveLength(3); // nothing changed: nothing sent
    });
  });

  test('the payload is the phone and nothing else', async () => {
    await rolledBack(async (tx) => {
      const [row] = await tx<{ p: Record<string, unknown> }[]>`select public.inbox_live_payload(${A}) as p`;
      expect(row?.p).toEqual({ phone: A });
    });
  });

  test('a failing broadcast never fails the insert', async () => {
    await rolledBack(async (tx) => {
      await tx.unsafe(`create or replace function public.inbox_live_send(p_phones text[]) returns void
        language plpgsql set search_path = '' as $$ begin raise exception 'realtime down'; end $$;`);
      await tx`insert into public.messages (direction, phone_e164, body) values ('inbound', ${A}, 'still saved')`;
      await tx`update public.messages set status = 'read' where phone_e164 = ${A}`;
      const [row] = await tx<{ n: number }[]>`select count(*)::int n from public.messages where phone_e164 = ${A} and status = 'read'`;
      expect(row?.n).toBe(1);
    });
  });

  test('admin and sales may join; teacher, family, a disabled login and a role without inbox.read may not', async () => {
    await rolledBack(async (tx) => {
      const sales = await assistant(tx, 'live-sales');
      const disabled = await assistant(tx, 'live-off');
      await tx`update public.profiles set disabled_at = now() where id = ${disabled}`;
      const family = await profile(tx, { tag: 'live-family', role: 'guardian' });
      const [custom] = await tx<{ id: string }[]>`insert into public.roles (key, name_ar, base_role)
        values ('live-no-inbox', 'بلا محادثات', 'admin') returning id`;
      const noInbox = await profile(tx, { tag: 'live-noinbox', role: 'admin', roleId: custom?.id ?? '' });
      const joins = async (who: string) =>
        (await as(tx, who, () => tx<{ ok: boolean }[]>`select public.inbox_live_reader() as ok`))[0]?.ok;
      expect(await joins(await userId(tx, USERS.admin.email))).toBe(true);
      expect(await joins(sales)).toBe(true);
      for (const who of [await userId(tx, USERS.teacher.email), family, disabled, noInbox]) expect(await joins(who)).toBe(false);
    });
  });

  test('anon cannot even ask; the select policy is installed wherever Realtime runs, never an insert policy', async () => {
    await rolledBack(async (tx) => {
      const anon = await tx
        .savepoint(async (sp) => {
          await sp`set local role anon`;
          await sp`select public.inbox_live_reader()`;
        })
        .then(() => 'allowed', (e: { code?: string }) => e.code);
      expect(anon).toBe('42501');
      const [rt] = await tx<{ t: string | null }[]>`select to_regclass('realtime.messages')::text as t`;
      const policies = await tx<{ policyname: string; cmd: string }[]>`select policyname, cmd from pg_policies
        where schemaname = 'realtime' and tablename = 'messages' and policyname = 'inbox_staff_read'`;
      expect(policies).toEqual(rt?.t ? [{ policyname: 'inbox_staff_read', cmd: 'SELECT' }] : []);
      if (!rt?.t) expect((await tx<{ ok: boolean }[]>`select public.inbox_live_install() as ok`)[0]?.ok).toBe(false);
    });
  });
});
