import { ar, expect, test } from '../../support/core/fixtures';
import { openThread } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/messages';
import { withSql } from '../../support/core/schedule';
import { messagesWithLine, SINGLE_LINE, stubInboundOn } from '../../support/messaging/wa-lines';
import { stubReset } from '../../support/wa-stub';

// Two WhatsApp lines, inbound side (docs/12 §13.6, R-MSG-04, R-LEAD-01): the chat number's webhook
// is verified with ITS app secret and its rows are stamped 'chat'; the same phone on both numbers
// is ONE thread; an id that is neither line, or a bad signature, stores nothing.

const WAIT = { timeout: 30_000 };
const words = ar.enums.waLine;

async function threadLines(phone: string): Promise<{ n: number; last: string | null }> {
  const rows = await withSql((sql) => sql<{ last_inbound_line: string | null }[]>`
    select last_inbound_line from public.v_threads where phone_e164 = ${phone}`);
  return { n: rows.length, last: rows[0]?.last_inbound_line ?? null };
}

test.describe('two WhatsApp lines — inbound (R-MSG-04)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line is configured');
  test.beforeEach(async () => {
    await stubReset();
  });

  test('a chat-line inbound (chat secret verifies) is stored with line chat', async () => {
    const digits = freshDigits();
    const res = await stubInboundOn('chat', { from: digits, name: `محادثة ${digits.slice(-4)}`, text: 'السلام عليكم' });
    expect(res.status).toBe(200);
    await expect.poll(() => messagesWithLine(`+${digits}`), WAIT).toEqual([
      expect.objectContaining({ direction: 'inbound', line: 'chat', body: 'السلام عليكم' }),
    ]);
    expect(await threadLines(`+${digits}`)).toEqual({ n: 1, last: 'chat' });
  });

  test('the same phone on both numbers joins ONE thread with a badge per bubble', async ({ asRole }) => {
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `خطان ${digits.slice(-4)}`;
    expect((await stubInboundOn('chat', { from: digits, name, text: 'من رقم المحادثات' })).status).toBe(200);
    await expect.poll(async () => (await messagesWithLine(phone)).length, WAIT).toBe(1);
    expect((await stubInboundOn('notifications', { from: digits, name, text: 'من رقم الإشعارات' })).status).toBe(200);
    await expect.poll(async () => (await messagesWithLine(phone)).map((m) => m.line), WAIT).toEqual(['chat', 'notifications']);
    expect(await threadLines(phone)).toEqual({ n: 1, last: 'notifications' });

    const page = await asRole('admin');
    const log = await openThread(page, name);
    const badges = log.getByTestId('line-badge');
    await expect(badges).toHaveCount(2);
    await expect(log.locator('[data-testid="line-badge"][data-line="chat"]')).toHaveText(words.chat);
    await expect(log.locator('[data-testid="line-badge"][data-line="notifications"]')).toHaveText(words.notifications);
  });

  test('an id that is neither line is answered 200 and stores nothing', async () => {
    const digits = freshDigits();
    const phone = `+${digits}`;
    const res = await stubInboundOn('notifications', { from: digits, text: 'رقم غريب', phoneNumberId: 'e2e-other-phone' });
    expect(res.status).toBe(200);
    // A later message of the same phone proves the webhook has run past the ignored one.
    expect((await stubInboundOn('chat', { from: digits, text: 'رسالة صحيحة' })).status).toBe(200);
    await expect.poll(async () => (await messagesWithLine(phone)).length, WAIT).toBe(1);
    expect((await messagesWithLine(phone)).map((m) => m.body)).toEqual(['رسالة صحيحة']);
  });

  test('a bad signature on the chat line is 401 and stores nothing', async () => {
    const digits = freshDigits();
    const phone = `+${digits}`;
    const bad = await stubInboundOn('chat', { from: digits, text: 'توقيع خاطئ', signWith: 'not-the-chat-secret' });
    expect(bad.status).toBe(401);
    // A correctly signed message of the same phone is stored: only the forged one was refused.
    expect((await stubInboundOn('notifications', { from: digits, text: 'صحيحة' })).status).toBe(200);
    await expect.poll(async () => (await messagesWithLine(phone)).length, WAIT).toBe(1);
    expect((await messagesWithLine(phone)).map((m) => [m.body, m.line])).toEqual([['صحيحة', 'notifications']]);
  });
});
