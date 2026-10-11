import type { WaLine } from '@ab/shared';
import { ar, expect, test } from '../support/fixtures';
import { openThread } from '../support/inbox';
import { freshDigits } from '../support/messages';
import {
  CHAT_PN,
  messagesWithLine,
  NOTIF_PN,
  profileIdOf,
  queueTemplate,
  sentVia,
  SINGLE_LINE,
  stubInboundOn,
  stubReadsByLine,
} from '../support/wa-lines';
import { setMessaging, stubReset } from '../support/wa-stub';

// Two WhatsApp lines, outbound side (docs/12 §13.3, R-MSG-01, R-MSG-02, R-LEAD-02): a session reply
// leaves from the line of the customer's newest inbound and its row is stamped with it; a template
// ALWAYS leaves from the notifications number; opening a thread marks it read on its own line.

const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const KEY = 'booking_confirmation_plain';

const textsTo = async (pn: string, digits: string) =>
  (await sentVia(pn)).filter((m) => m.to === digits && m.type === 'text');

/** A fresh contact writes on `line`; the admin answers from the thread. */
async function replyAfter(input: { page: Parameters<typeof openThread>[0]; line: WaLine }) {
  const digits = freshDigits();
  const name = `رد ${input.line} ${digits.slice(-4)}`;
  expect((await stubInboundOn(input.line, { from: digits, name, text: 'السلام عليكم' })).status).toBe(200);
  await openThread(input.page, name);
  const reply = `وعليكم السلام ${digits.slice(-4)}`;
  await input.page.getByRole('textbox', { name: ar.inbox.composer.messageLabel }).fill(reply);
  await input.page.getByRole('button', { name: ar.inbox.composer.send, exact: true }).click();
  return { digits, phone: `+${digits}`, reply };
}

test.describe('two WhatsApp lines — replies and reads (R-MSG-01, R-MSG-02)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line is configured');
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('a reply after a chat inbound leaves via the chat number, stamped chat', async ({ asRole }) => {
    test.setTimeout(120_000);
    const r = await replyAfter({ page: await asRole('admin'), line: 'chat' });
    await expect.poll(async () => (await textsTo(CHAT_PN, r.digits)).length, WAIT).toBe(1);
    expect(await textsTo(NOTIF_PN, r.digits)).toHaveLength(0);
    await expect.poll(async () => (await messagesWithLine(r.phone)).filter((m) => m.direction === 'outbound'), WAIT).toEqual([
      expect.objectContaining({ body: r.reply, line: 'chat', status: 'sent' }),
    ]);
  });

  test('a reply after a notifications inbound leaves via the notifications number', async ({ asRole }) => {
    test.setTimeout(120_000);
    const r = await replyAfter({ page: await asRole('admin'), line: 'notifications' });
    await expect.poll(async () => (await textsTo(NOTIF_PN, r.digits)).length, WAIT).toBe(1);
    expect(await textsTo(CHAT_PN, r.digits)).toHaveLength(0);
    await expect.poll(async () => (await messagesWithLine(r.phone)).filter((m) => m.direction === 'outbound'), WAIT).toEqual([
      expect.objectContaining({ body: r.reply, line: 'notifications', status: 'sent' }),
    ]);
  });

  test('a queued template leaves via the notifications number even after a chat inbound', async () => {
    test.setTimeout(120_000);
    const digits = freshDigits();
    const phone = `+${digits}`;
    expect((await stubInboundOn('chat', { from: digits, text: 'أريد الحجز' })).status).toBe(200);
    await expect.poll(async () => (await messagesWithLine(phone)).length, WAIT).toBe(1);
    await queueTemplate({ phone, key: KEY, createdBy: await profileIdOf('admin') });
    await expect.poll(async () => (await sentVia(NOTIF_PN)).filter((m) => m.to === digits && m.template === KEY).length, WAIT).toBe(1);
    expect((await sentVia(CHAT_PN)).filter((m) => m.to === digits)).toHaveLength(0);
    await expect.poll(async () => (await messagesWithLine(phone)).find((m) => m.template_key === KEY), WAIT).toEqual(
      expect.objectContaining({ line: 'notifications', status: 'sent' }),
    );
  });

  test('opening a chat thread marks the message read on the chat number', async ({ asRole }) => {
    test.setTimeout(120_000);
    const digits = freshDigits();
    const name = `قراءة ${digits.slice(-4)}`;
    const inbound = await stubInboundOn('chat', { from: digits, name, text: 'هل وصلت رسالتي؟' });
    expect(inbound.status).toBe(200);
    await openThread(await asRole('admin'), name);
    await expect.poll(() => stubReadsByLine(), WAIT).toContainEqual({ phoneNumberId: CHAT_PN, messageId: inbound.id });
    expect((await stubReadsByLine()).filter((r) => r.messageId === inbound.id && r.phoneNumberId === NOTIF_PN)).toHaveLength(0);
  });
});
