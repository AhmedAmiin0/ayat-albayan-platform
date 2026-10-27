import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../support/edit-time';

// Message reactions (migration 20261028000930, owner 2026-10-27): their_reaction / our_reaction are columns
// of the reacted message; reaction ROWS (stored before, and our reaction sends) are never a preview or
// unread; the backfill fills their_reaction from the stored rows (same phone, latest wins) and deletes
// nothing; a failed reaction send puts ours back. Example numbers only. Rolled back.

const A = '+966500000901';
const B = '+966500000902';


async function message(tx: Tx, input: { phone: string; wamid: string; at: string; direction?: string }) {
  const [row] = await tx<{ id: string }[]>`
    insert into public.messages (direction, status, phone_e164, body, wa_message_id, created_at, read_at)
    values (${input.direction ?? 'outbound'}::public.message_direction, 'delivered', ${input.phone}, 'موعد الحلقة غدًا',
      ${input.wamid}, ${input.at}, ${input.direction === 'inbound' ? input.at : null}) returning id`;
  return row?.id ?? '';
}

/** An inbound reaction row as the old webhook stored it (unread, its own wamid). */
async function oldReaction(tx: Tx, input: { phone: string; target: string; emoji: string; at: string }) {
  await tx`insert into public.messages (direction, status, phone_e164, wa_message_id, interactive_payload, created_at)
    values ('inbound', 'delivered', ${input.phone}, ${`wamid.r-${input.target}-${input.at}`},
      ${tx.json({ type: 'reaction', reaction: { message_id: input.target, emoji: input.emoji } })}, ${input.at})`;
}

const their = async (tx: Tx, id: string) =>
  (await tx<{ r: string | null }[]>`select their_reaction as r from public.messages where id = ${id}`)[0]?.r;

test.describe('message reactions (migration 900)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the backfill: latest per target and phone, never another phone, nothing deleted; hidden from preview and unread', async () => {
    await rolledBack(async (tx) => {
      const x = await message(tx, { phone: A, wamid: 'wamid.rx-X', at: '2026-10-20T10:00:00Z' });
      const y = await message(tx, { phone: A, wamid: 'wamid.rx-Y', at: '2026-10-20T10:01:00Z' });
      await oldReaction(tx, { phone: A, target: 'wamid.rx-X', emoji: '👍', at: '2026-10-20T11:00:00Z' });
      await oldReaction(tx, { phone: A, target: 'wamid.rx-X', emoji: '❤️', at: '2026-10-20T12:00:00Z' });
      await oldReaction(tx, { phone: B, target: 'wamid.rx-Y', emoji: '😂', at: '2026-10-20T12:00:00Z' });
      await oldReaction(tx, { phone: A, target: 'wamid.rx-Y', emoji: '', at: '2026-10-20T13:00:00Z' });
      const before = await tx<{ n: number }[]>`select count(*)::int as n from public.messages where phone_e164 in (${A}, ${B})`;
      const [run] = await tx<{ n: number }[]>`select public.messages_reaction_backfill() as n`;
      expect(run?.n).toBeGreaterThanOrEqual(1);
      expect([await their(tx, x), await their(tx, y)]).toEqual(['❤️', null]);
      const after = await tx<{ n: number }[]>`select count(*)::int as n from public.messages where phone_e164 in (${A}, ${B})`;
      expect(after[0]?.n).toBe(before[0]?.n);
      const [t] = await tx<{ last_message_id: string; unread_count: number }[]>`
        select last_message_id, unread_count from public.v_threads where phone_e164 = ${A}`;
      expect(t).toEqual({ last_message_id: y, unread_count: 0 });
      // B has only a reaction row: no chat at all.
      expect(await tx`select 1 from public.v_threads where phone_e164 = ${B}`).toHaveLength(0);
      // Again: nothing left to fill.
      const [again] = await tx<{ n: number }[]>`select public.messages_reaction_backfill() as n`;
      expect(again?.n).toBe(0);
    });
  });

  test('a failed reaction send puts ours back, unless a newer one replaced it', async () => {
    await rolledBack(async (tx) => {
      const x = await message(tx, { phone: A, wamid: 'wamid.rx-F', at: '2026-10-20T10:00:00Z', direction: 'inbound' });
      await tx`update public.messages set our_reaction = '👍', our_reaction_at = now() where id = ${x}`;
      const payload = tx.json({ type: 'reaction', reaction: { message_id: 'wamid.rx-F', emoji: '👍' }, target_id: x, previous: { emoji: '❤️', by: null, at: null } });
      const [send] = await tx<{ id: string }[]>`insert into public.messages (direction, status, phone_e164, body, interactive_payload)
        values ('outbound', 'queued', ${A}, '👍', ${payload}) returning id`;
      await tx`update public.messages set status = 'failed', error_code = '131047' where id = ${send?.id ?? ''}`;
      const [back] = await tx<{ r: string | null }[]>`select our_reaction as r from public.messages where id = ${x}`;
      expect(back?.r).toBe('❤️');
      // A newer tap (😂) after this send: its failure leaves the newer one alone.
      await tx`update public.messages set our_reaction = '😂' where id = ${x}`;
      await tx`update public.messages set status = 'queued' where id = ${send?.id ?? ''}`;
      await tx`update public.messages set status = 'failed' where id = ${send?.id ?? ''}`;
      const [kept] = await tx<{ r: string | null }[]>`select our_reaction as r from public.messages where id = ${x}`;
      expect(kept?.r).toBe('😂');
    });
  });

  test('a reaction change is broadcast through the existing update trigger (phone only)', async () => {
    await rolledBack(async (tx) => {
      const x = await message(tx, { phone: A, wamid: 'wamid.rx-L', at: '2026-10-20T10:00:00Z' });
      await tx.unsafe(`create temp table live_sent (id serial, phones text[]) on commit drop;
        create or replace function public.inbox_live_send(p_phones text[]) returns void
          language sql set search_path = '' as $$ insert into pg_temp.live_sent (phones) values (p_phones) $$;`);
      await tx`update public.messages set their_reaction = '🙏' where id = ${x}`;
      const sent = await tx<{ phones: string[] }[]>`select phones from pg_temp.live_sent order by id`;
      expect(sent.map((r) => r.phones)).toEqual([[A]]);
    });
  });
});
