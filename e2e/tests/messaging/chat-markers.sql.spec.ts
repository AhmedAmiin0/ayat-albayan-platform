import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';

// WhatsApp edits, deletes and reactions (migration 20261030000985, owner 2026-10-30): a marker row
// applies to the message it names on the same phone, now or when that message arrives (pending),
// the newest edit wins whatever the arrival order, and a marker is never the chat's last message
// nor unread. Rolled back; database only, no message is ever sent.

const A = '+966500000985';
const B = '+966500000986';

type Payload = Record<string, unknown>;

async function marker(tx: Tx, m: { phone: string; id: string; payload: Payload; at?: string }) {
  await tx`insert into public.messages (direction, status, phone_e164, wa_message_id, interactive_payload, created_at)
    values ('outbound', 'sent', ${m.phone}, ${m.id}, ${tx.json(m.payload as never)}, ${m.at ?? new Date().toISOString()})`;
}
async function message(tx: Tx, m: { phone: string; id: string; body: string; direction?: string }) {
  await tx`insert into public.messages (direction, status, phone_e164, wa_message_id, body, created_at)
    values (${m.direction ?? 'outbound'}::public.message_direction, 'sent', ${m.phone}, ${m.id}, ${m.body},
      now() - interval '1 hour')`;
}
async function row(tx: Tx, id: string) {
  const [r] = await tx<
    { body: string | null; edited: boolean; deleted: boolean; our_reaction: string | null }[]
  >`select body, edited_at is not null as edited, deleted_at is not null as deleted, our_reaction
    from public.messages where wa_message_id = ${id}`;
  if (!r) throw new Error(`no row ${id}`);
  return r;
}
const edit = (target: string, text: string) => ({ type: 'edit', marker: true, target, text });

test.describe('chat markers (migration 20261030000985)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('an edit, a revoke and a reaction apply to a stored message of the same phone only', async () => {
    await rolledBack(async (tx) => {
      await message(tx, { phone: A, id: 'wamid.e2e.985.1', body: 'الحلقة 5' });
      await message(tx, { phone: B, id: 'wamid.e2e.985.2', body: 'other chat' });
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.e1',
        payload: edit('wamid.e2e.985.1', 'الحلقة 6'),
      });
      const reaction = { message_id: 'wamid.e2e.985.1', emoji: '👍' };
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.r1',
        payload: { type: 'reaction', marker: true, target: reaction.message_id, reaction },
      });
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.v2',
        payload: { type: 'revoke', marker: true, target: 'wamid.e2e.985.2' },
      });
      expect(await row(tx, 'wamid.e2e.985.1')).toEqual({
        body: 'الحلقة 6',
        edited: true,
        deleted: false,
        our_reaction: '👍',
      });
      expect(await row(tx, 'wamid.e2e.985.2')).toMatchObject({ deleted: false });
    });
  });

  test('markers that arrive first wait for their message; the newest edit wins', async () => {
    await rolledBack(async (tx) => {
      const at = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.e3',
        payload: edit('wamid.e2e.985.3', 'third'),
        at: at(10),
      });
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.e2',
        payload: edit('wamid.e2e.985.3', 'second'),
        at: at(20),
      });
      await message(tx, { phone: A, id: 'wamid.e2e.985.3', body: 'first', direction: 'inbound' });
      expect(await row(tx, 'wamid.e2e.985.3')).toMatchObject({ body: 'third', edited: true });
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.v3',
        payload: { type: 'revoke', marker: true, target: 'wamid.e2e.985.3' },
      });
      expect(await row(tx, 'wamid.e2e.985.3')).toMatchObject({ deleted: true, body: 'third' });
    });
  });

  test('a marker is never the last message nor unread (summaries and v_threads)', async () => {
    await rolledBack(async (tx) => {
      await message(tx, {
        phone: A,
        id: 'wamid.e2e.985.4',
        body: 'السلام عليكم',
        direction: 'inbound',
      });
      await marker(tx, {
        phone: A,
        id: 'wamid.e2e.985.e4',
        payload: edit('wamid.e2e.985.4', 'تعديل'),
      });
      const [s] = await tx<{ last_body: string; unread_count: number }[]>`
        select last_body, unread_count from public.thread_summaries where phone_e164 = ${A}`;
      expect(s).toEqual({ last_body: 'تعديل', unread_count: 1 });
      const [v] = await tx<
        { last_body: string }[]
      >`select last_body from public.v_threads where phone_e164 = ${A}`;
      expect(v?.last_body).toBe('تعديل');
    });
  });
});
