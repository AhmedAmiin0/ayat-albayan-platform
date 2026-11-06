import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';

// v_threads on thread_summaries (migration 20261106001100, docs/44 K4): column by column 984's
// aggregate (verbatim but for the id tiebreak, BUG9), + activity. Rolled back; no message is sent.

const A = '+966500001101';
const B = '+966500001102';
const LAST_INBOUND = 'last_notifications_inbound_at';
const ACTIVITY = ['last_family_read_at', 'last_activity_at'];

/** Migration 984's v_threads select, verbatim but for `, id desc` (BUG9). */
const OLD = `
with last_message as (
  select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
    body as last_body, template_key as last_template_key, status as last_status,
    media_mime as last_media_mime, created_at as last_message_at
  from public.messages
  where not public.message_is_reaction(interactive_payload)
  order by phone_e164, created_at desc, id desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null
      and not public.message_is_reaction(interactive_payload)))::int as unread_count,
    (array_agg(line order by created_at desc, id desc))[1] as last_inbound_line,
    max(created_at) filter (where line = 'chat') as last_chat_inbound_at,
    max(created_at) filter (where line is distinct from 'chat' and line is distinct from 'calls')
      as last_notifications_inbound_at
  from public.messages
  where direction = 'inbound'
  group by phone_e164
)
select m.phone_e164, m.last_message_id, m.last_direction, m.last_body, m.last_template_key,
  m.last_status, m.last_media_mime, m.last_message_at,
  i.last_inbound_at, coalesce(i.unread_count, 0) as unread_count,
  l.id as lead_id, l.name as lead_name, l.status as lead_status, l.source as lead_source,
  g.id as guardian_id, g.name as guardian_name, g.tz as guardian_tz,
  t.id as teacher_id, t.display_name_ar as teacher_name,
  coalesce(g.name, l.name, t.display_name_ar) as display_name,
  i.last_inbound_line, i.last_chat_inbound_at, i.last_notifications_inbound_at
from last_message m
left join inbound i on i.phone_e164 = m.phone_e164
left join public.leads l on l.phone_e164 = m.phone_e164
left join public.guardian_phones gp on gp.phone_e164 = m.phone_e164
left join public.guardians g on g.id = gp.guardian_id
left join public.teachers t on t.phone_e164 = m.phone_e164`;

/** Phones in one and not the other, and every column whose value differs on a shared phone. */
async function differ(tx: Tx): Promise<{ phones: number; columns: string[] }> {
  const [p] = await tx.unsafe<{ n: number }[]>(`select count(*)::int as n from (
    ((select phone_e164 from (${OLD}) o) except all (select phone_e164 from public.v_threads))
    union all
    ((select phone_e164 from public.v_threads) except all (select phone_e164 from (${OLD}) o))) x`);
  const cols = await tx.unsafe<{ key: string }[]>(`select distinct e.key from (${OLD}) o
    join public.v_threads n on n.phone_e164 = o.phone_e164
    cross join lateral jsonb_each(to_jsonb(o)) e
    where e.value is distinct from to_jsonb(n) -> e.key order by e.key`);
  return { phones: p?.n ?? -1, columns: cols.map((c) => c.key) };
}

async function put(tx: Tx, m: { phone: string; dir: string; at: string; line?: string }) {
  const [r] = await tx<{ id: string }[]>`insert into public.messages
    (direction, phone_e164, body, status, line, created_at)
    values (${m.dir}::public.message_direction, ${m.phone}, 'نص', 'delivered',
      ${m.line ?? null}::public.wa_line, ${m.at}) returning id`;
  return r?.id ?? '';
}
async function react(tx: Tx, phone: string, at: string) {
  const payload = { type: 'reaction', reaction: { message_id: 'wamid.e2e.1100', emoji: '👍' } };
  await tx`insert into public.messages
    (direction, phone_e164, status, interactive_payload, created_at)
    values ('inbound', ${phone}, 'delivered', ${tx.json(payload)}, ${at})`;
}
async function activity(tx: Tx, phone: string) {
  const [r] = await tx<{ fam: string | null; act: string | null; last: string }[]>`select
    (last_family_read_at at time zone 'UTC')::text as fam,
    (last_activity_at at time zone 'UTC')::text as act, last_message_id::text as last
    from public.v_threads where phone_e164 = ${phone}`;
  return r;
}

test.describe('v_threads on thread_summaries + activity (migration 20261106001100)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('every column equals migration 984’s aggregate on the seeded data', async () => {
    await rolledBack(async (tx) => {
      expect(await differ(tx)).toEqual({ phones: 0, columns: [] });
    });
  });

  test('stays equal: a created_at tie, reactions, calls line, read stamps, deletes', async () => {
    await rolledBack(async (tx) => {
      const at = '2026-11-01T10:00:00Z';
      const ids = [
        await put(tx, { phone: A, dir: 'outbound', at }),
        await put(tx, { phone: A, dir: 'inbound', at, line: 'chat' }),
      ];
      await react(tx, A, '2026-11-01T10:05:00Z');
      await put(tx, { phone: B, dir: 'inbound', at, line: 'calls' });
      await react(tx, B, '2026-11-01T10:06:00Z');
      expect(await differ(tx)).toEqual({ phones: 0, columns: [] });
      // BUG9: of two rows with one created_at, the chat's last bubble (id desc), not the reaction.
      expect((await activity(tx, A))?.last).toBe([...ids].sort().reverse()[0]);
      await tx`update public.messages set read_at = now()
        where phone_e164 = ${A} and direction = 'inbound'`;
      await tx`delete from public.messages where phone_e164 = ${B} and interactive_payload is null`;
      expect(await differ(tx)).toEqual({ phones: 0, columns: [] });
      expect(await tx`select 1 from public.v_threads where phone_e164 = ${B}`).toHaveLength(0);
    });
  });

  test('last activity: the family read ours (outbound read_at alone) or wrote', async () => {
    await rolledBack(async (tx) => {
      const out = await put(tx, { phone: A, dir: 'outbound', at: '2026-11-01T09:00:00Z' });
      await put(tx, { phone: A, dir: 'inbound', at: '2026-11-01T08:00:00Z', line: 'chat' });
      // Staff opening the chat stamps INBOUND read_at: never the family's activity.
      await tx`update public.messages set read_at = '2026-11-01T11:00:00Z'
        where phone_e164 = ${A} and direction = 'inbound'`;
      expect(await activity(tx, A)).toMatchObject({ fam: null, act: '2026-11-01 08:00:00' });
      await tx`update public.messages set read_at = '2026-11-01T12:00:00Z' where id = ${out}`;
      const noon = '2026-11-01 12:00:00';
      expect(await activity(tx, A)).toMatchObject({ fam: noon, act: noon });
      const [badge] = await tx<{ same: boolean }[]>`select
        (select count(*) from public.thread_summaries where unread_count > 0)
        = (select count(*) from public.v_threads where unread_count > 0) as same`;
      expect(badge?.same).toBe(true);
    });
  });

  test('two columns appended to both views; anon and authenticated still denied', async () => {
    await rolledBack(async (tx) => {
      const cols = async (view: string) =>
        (
          await tx<{ c: string }[]>`select column_name as c from information_schema.columns
          where table_schema = 'public' and table_name = ${view}
          order by ordinal_position`
        ).map((r) => r.c);
      for (const view of ['v_threads', 'v_list_threads']) {
        expect((await cols(view)).slice(-3)).toEqual([LAST_INBOUND, ...ACTIVITY]);
      }
      const [g] = await tx<{ anon: boolean; auth: boolean }[]>`select
        has_table_privilege('anon', 'public.v_threads', 'select') as anon,
        has_table_privilege('authenticated', 'public.v_threads', 'select') as auth`;
      expect(g).toEqual({ anon: false, auth: false });
    });
  });
});
