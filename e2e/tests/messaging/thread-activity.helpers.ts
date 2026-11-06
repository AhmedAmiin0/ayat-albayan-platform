import type { Tx } from '../../support/core/rls';

// Shared by the thread-activity SQL specs (migration 20261106001100, docs/44 K4): migration 984's
// v_threads select as the reference, and small message writers. Database only.

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

/** Old-definition rows absent from v_threads and v_threads rows absent from the old (phones). */
export async function differ(tx: Tx): Promise<{ missing: string[]; extra: string[] }> {
  const [r] = await tx.unsafe<{ missing: string[]; extra: string[] }[]>(`with
    o as (select to_jsonb(x) as j from (${OLD}) x),
    n as (select to_jsonb(x) - 'last_family_read_at' - 'last_activity_at' as j
      from public.v_threads x)
    select
      coalesce((select array_agg(j ->> 'phone_e164' order by j ->> 'phone_e164')
        from (select j from o except all select j from n) a), '{}') as missing,
      coalesce((select array_agg(j ->> 'phone_e164' order by j ->> 'phone_e164')
        from (select j from n except all select j from o) b), '{}') as extra`);
  return r ?? { missing: ['?'], extra: ['?'] };
}

export const SAME = { missing: [], extra: [] };

export async function put(tx: Tx, m: { phone: string; dir: string; at: string; line?: string }) {
  const [r] = await tx<{ id: string }[]>`insert into public.messages
    (direction, phone_e164, body, status, line, created_at)
    values (${m.dir}::public.message_direction, ${m.phone}, 'نص', 'delivered',
      ${m.line ?? null}::public.wa_line, ${m.at}) returning id`;
  return r?.id ?? '';
}

export async function react(tx: Tx, phone: string, at: string) {
  const payload = { type: 'reaction', reaction: { message_id: 'wamid.e2e.1100', emoji: '👍' } };
  await tx`insert into public.messages
    (direction, phone_e164, status, interactive_payload, created_at)
    values ('inbound', ${phone}, 'delivered', ${tx.json(payload)}, ${at})`;
}
