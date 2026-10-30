import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/teaching/edit-time';

// «رد» / «إعادة توجيه» (migration 20261025000690, owner 2026-10-25): an inbound reply is linked to our
// row of the SAME chat by its context wamid; a deleted original leaves the reply and the copy standing.
// Rolled back.

const A = '+966500000901';
const B = '+966500000902';
type Row = { id: string; reply_to_message_id: string | null; forwarded_from_id: string | null };

const outbound = async (tx: Tx, phone: string) => {
  const wamid = `wamid.test-${randomUUID()}`;
  const [row] = await tx<{ id: string }[]>`
    insert into public.messages (direction, status, phone_e164, body, wa_message_id)
    values ('outbound', 'sent', ${phone}, 'موعد الحلقة غدًا', ${wamid}) returning id`;
  return { id: row?.id ?? '', wamid };
};
const inboundReply = async (tx: Tx, input: { phone: string; wamid: string }) => {
  const [row] = await tx<Row[]>`
    insert into public.messages (direction, status, phone_e164, body, reply_to_wa_id)
    values ('inbound', 'delivered', ${input.phone}, 'تمام', ${input.wamid})
    returning id, reply_to_message_id, forwarded_from_id`;
  return row;
};

test.describe('messages reply / forward links (migration 690)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test("an inbound reply is linked to our message of the same chat, never another chat's", async () => {
    await rolledBack(async (tx) => {
      const ours = await outbound(tx, A);
      expect((await inboundReply(tx, { phone: A, wamid: ours.wamid }))?.reply_to_message_id).toBe(ours.id);
      expect((await inboundReply(tx, { phone: B, wamid: ours.wamid }))?.reply_to_message_id).toBeNull();
    });
  });

  test('deleting the original sets the links to null and keeps the reply and the forwarded copy', async () => {
    await rolledBack(async (tx) => {
      const ours = await outbound(tx, A);
      const reply = await inboundReply(tx, { phone: A, wamid: ours.wamid });
      const [copy] = await tx<{ id: string }[]>`
        insert into public.messages (direction, status, phone_e164, body, forwarded_from_id)
        values ('outbound', 'queued', ${B}, 'موعد الحلقة غدًا', ${ours.id}) returning id`;
      await tx`delete from public.messages where id = ${ours.id}`;
      const rows = await tx<Row[]>`select id, reply_to_message_id, forwarded_from_id from public.messages where id in (${reply?.id ?? ''}, ${copy?.id ?? ''})`;
      expect(rows).toHaveLength(2);
      for (const r of rows) expect([r.reply_to_message_id, r.forwarded_from_id]).toEqual([null, null]);
    });
  });
});
