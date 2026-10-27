import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../support/rls';

// Fast chats list (migration 20261028000850): v_threads now reads thread_summaries, kept by triggers on
// messages. It must return exactly what the old aggregate over all messages returned (migration 290's
// select, the newest message picked by created_at then id: the old distinct on had no tiebreak), on the
// seeded data and after inserts, read stamps, status ticks and deletes; and the unread badge's count must
// equal the list's total. Rolled back; database only, no message is ever sent.

const A = '+966500000850';
const B = '+966500000851';

/** Migration 290's v_threads select, verbatim but for the id tiebreak. */
const OLD = `
with last_message as (
  select distinct on (phone_e164) phone_e164, id as last_message_id, direction as last_direction,
    body as last_body, template_key as last_template_key, status as last_status,
    media_mime as last_media_mime, created_at as last_message_at
  from public.messages
  order by phone_e164, created_at desc, id desc
), inbound as (
  select phone_e164, max(created_at) as last_inbound_at,
    (count(*) filter (where read_at is null))::int as unread_count,
    (array_agg(line order by created_at desc, id desc))[1] as last_inbound_line,
    max(created_at) filter (where line = 'chat') as last_chat_inbound_at,
    max(created_at) filter (where line is distinct from 'chat') as last_notifications_inbound_at
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
left join public.guardians g on g.phone_e164 = m.phone_e164
left join public.teachers t on t.phone_e164 = m.phone_e164`;

/** Rows in one and not the other, both ways (0 and 0 = the same rows, duplicates included). */
async function differ(tx: Tx): Promise<{ missing: number; extra: number; rows: number }> {
  const [r] = await tx.unsafe<{ missing: number; extra: number; rows: number }[]>(`select
    (select count(*)::int from (${OLD} except all select * from public.v_threads) x) as missing,
    (select count(*)::int from (select * from public.v_threads except all ${OLD}) y) as extra,
    (select count(*)::int from public.v_threads) as rows`);
  if (!r) throw new Error('no comparison row');
  return r;
}

test.describe('thread_summaries behind v_threads (migration 20261028000850)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the new v_threads returns the old definition’s rows on the seeded data', async () => {
    await rolledBack(async (tx) => {
      expect(await differ(tx)).toMatchObject({ missing: 0, extra: 0 });
    });
  });

  test('the triggers keep it equal: inserts (one and many), read stamps, a status tick, a line change, deletes', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.messages (direction, phone_e164, body, status, line, created_at) values
        ('inbound', ${A}, 'السلام عليكم', 'delivered', 'chat', now() - interval '3 minutes')`;
      await tx`insert into public.messages (direction, phone_e164, body, status, created_at) values
        ('outbound', ${A}, 'وعليكم السلام', 'queued', now() - interval '2 minutes'),
        ('inbound', ${B}, 'سؤال', 'delivered', now() - interval '1 minute'),
        ('inbound', ${B}, 'سؤال آخر', 'delivered', now())`;
      expect(await differ(tx)).toMatchObject({ missing: 0, extra: 0 });
      const [a] = await tx<{ unread_count: number; last_status: string }[]>`select unread_count, last_status::text from public.thread_summaries where phone_e164 = ${A}`;
      expect(a).toEqual({ unread_count: 1, last_status: 'queued' });
      await tx`update public.messages set status = 'sent' where phone_e164 = ${A} and direction = 'outbound'`;
      await tx`update public.messages set read_at = now() where phone_e164 = ${B} and direction = 'inbound' and read_at is null`;
      await tx`update public.messages set line = 'notifications' where phone_e164 = ${A} and direction = 'inbound'`;
      expect(await differ(tx)).toMatchObject({ missing: 0, extra: 0 });
      const [after] = await tx<{ a: string; b: number }[]>`select
        (select last_status::text from public.thread_summaries where phone_e164 = ${A}) as a,
        (select unread_count from public.thread_summaries where phone_e164 = ${B}) as b`;
      expect(after).toEqual({ a: 'sent', b: 0 });
      await tx`delete from public.messages where phone_e164 = ${A} and direction = 'outbound'`;
      await tx`delete from public.messages where phone_e164 = ${B}`;
      expect(await differ(tx)).toMatchObject({ missing: 0, extra: 0 });
      const [gone] = await tx<{ n: number }[]>`select count(*)::int as n from public.thread_summaries where phone_e164 = ${B}`;
      expect(gone?.n).toBe(0);
    });
  });

  test('the unread badge count equals the list total, for everyone and inside a phone scope', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.messages (direction, phone_e164, body, status) values ('inbound', ${A}, 'جديد', 'delivered')`;
      const scope = [A, B];
      const [r] = await tx<{ badge: number; list: number; badge_scoped: number; list_scoped: number }[]>`select
        (select count(*)::int from public.thread_summaries where unread_count > 0) as badge,
        (select count(*)::int from public.v_threads where unread_count > 0) as list,
        (select count(*)::int from public.thread_summaries where unread_count > 0 and phone_e164 = any(${scope})) as badge_scoped,
        (select count(*)::int from public.v_threads where unread_count > 0 and phone_e164 = any(${scope})) as list_scoped`;
      expect(r?.badge).toBe(r?.list);
      expect(r?.badge_scoped).toBe(r?.list_scoped);
      expect(r?.badge_scoped).toBe(1);
    });
  });

  test('RLS on the table; anon and authenticated never write it', async () => {
    await rolledBack(async (tx) => {
      const [row] = await tx<{ rls: boolean; anon: boolean; auth: boolean }[]>`select
        (select relrowsecurity from pg_class where relname = 'thread_summaries' and relnamespace = 'public'::regnamespace) as rls,
        has_table_privilege('anon', 'public.thread_summaries', 'select') as anon,
        has_table_privilege('authenticated', 'public.thread_summaries', 'insert') as auth`;
      expect(row).toEqual({ rls: true, anon: false, auth: false });
    });
  });
});
