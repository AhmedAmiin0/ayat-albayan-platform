import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';

// A reply that arrives before the message it quotes (migration 20261031000995, owner 2026-10-31):
// the WhatsApp Business app's echo or Kapso's history stores our message after the family's
// reply; the reply is linked when that row (or its wamid) lands, on the SAME phone only, and a link
// already set is never re-pointed. Rolled back; database only, no message is ever sent.

const A = '+966500000995';
const B = '+966500000996';

const wamid = () => `wamid.e2e.995.${randomUUID()}`;

async function reply(tx: Tx, input: { phone: string; quoted: string }): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    insert into public.messages (direction, status, phone_e164, body, reply_to_wa_id)
    values ('inbound', 'delivered', ${input.phone}, 'تمام', ${input.quoted}) returning id`;
  return row?.id ?? '';
}
async function ours(tx: Tx, input: { phone: string; wamid: string | null }): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    insert into public.messages (direction, status, phone_e164, body, wa_message_id)
    values ('outbound', ${input.wamid ? 'sent' : 'queued'}::public.message_status, ${input.phone},
      'موعد الحلقة غدًا',
      ${input.wamid}) returning id`;
  return row?.id ?? '';
}
async function linkOf(tx: Tx, id: string): Promise<string | null> {
  const [row] = await tx<{ reply_to_message_id: string | null }[]>`
    select reply_to_message_id from public.messages where id = ${id}`;
  return row?.reply_to_message_id ?? null;
}

test.describe('replies linked when the quoted row lands later (migration 995)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('a reply stored first is linked when the quoted message arrives, on its phone only', async () => {
    await rolledBack(async (tx) => {
      const w = wamid();
      const mine = await reply(tx, { phone: A, quoted: w });
      const other = await reply(tx, { phone: B, quoted: w });
      expect(await linkOf(tx, mine)).toBeNull();
      const quoted = await ours(tx, { phone: A, wamid: w });
      expect(await linkOf(tx, mine)).toBe(quoted);
      expect(await linkOf(tx, other)).toBeNull();
    });
  });

  test('a row that gets its wamid by an update links the reply waiting for it', async () => {
    await rolledBack(async (tx) => {
      const w = wamid();
      const queued = await ours(tx, { phone: A, wamid: null });
      const waiting = await reply(tx, { phone: A, quoted: w });
      await tx`update public.messages set wa_message_id = ${w}, status = 'sent' where id = ${queued}`;
      expect(await linkOf(tx, waiting)).toBe(queued);
    });
  });

  test('a linked reply is never re-pointed, and re-saving the wamid changes nothing', async () => {
    await rolledBack(async (tx) => {
      const w = wamid();
      const first = await ours(tx, { phone: A, wamid: w });
      const linked = await reply(tx, { phone: A, quoted: w });
      expect(await linkOf(tx, linked)).toBe(first);
      const [before] = await tx<{ body: string; status: string }[]>`
        select body, status from public.messages where id = ${linked}`;
      await tx`update public.messages set wa_message_id = wa_message_id where id = ${first}`;
      expect(await linkOf(tx, linked)).toBe(first);
      const [after] = await tx<{ body: string; status: string }[]>`
        select body, status from public.messages where id = ${linked}`;
      expect(after).toEqual(before);
    });
  });
});
