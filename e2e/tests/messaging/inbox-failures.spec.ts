import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { bubble, lastOutbound, openThread, pushesForMessage, stubFail, outboundRows } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/core/messages';
import { setMessaging, stubInbound, stubReset, stubSent } from '../../support/core/wa-stub';

// A send that fails (R-MSG-03, R-MSG-05, M1–M3): Meta's error in words on the bubble, «حاول مرة أخرى»,
// the wa.me hand-off with its «بعتّها؟» question, sent-by-hand and undo. The stub's injected
// failure is one-shot. 131049 fails at once and is retryable (131047 would hide «حاول مرة أخرى»).

const CODE = 131049;
const messages = ar.messages;
const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };

interface Failed {
  page: Page;
  log: Locator;
  phone: string;
  reply: string;
  row: Locator;
}

/** A fresh lead writes, the admin's reply is refused by «Meta» with `CODE`: its failed bubble. */
async function failedReply(page: Page, label: string): Promise<Failed> {
  const digits = freshDigits();
  const name = `${label} ${digits.slice(-4)}`;
  expect((await stubInbound({ from: digits, name, text: 'السلام عليكم' })).status).toBe(200);
  const log = await openThread(page, name);
  await stubFail({ to: digits, code: CODE });
  const reply = `رد ${label} ${digits.slice(-4)}`;
  await page.getByRole('textbox', { name: ar.inbox.composer.messageLabel }).fill(reply);
  await page.getByRole('button', { name: ar.inbox.composer.send, exact: true }).click();
  const row = bubble(log, reply);
  const reason = messages.errorLine.replace('{reason}', messages.errors[String(CODE) as '131049']);
  await expect(row).toContainText(reason);
  await expect(row.getByRole('img', { name: ar.enums.messageStatus.failed, exact: true })).toBeVisible();
  return { page, log, phone: `+${digits}`, reply, row };
}

/** Clicks the wa.me link: the popup opens (wa.me itself is stubbed) once the row is held. */
async function handOff({ page, phone, row }: Failed): Promise<void> {
  const digits = phone.slice(1);
  await page.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, body: 'wa' }));
  const link = row.getByRole('link', { name: messages.clickToChat });
  await expect(link).toHaveAttribute('href', new RegExp(`^https://wa\\.me/${digits}\\?text=`));
  const popup = page.waitForEvent('popup');
  await link.click();
  await (await popup).waitForURL(/wa\.me/);
  await expect.poll(async () => (await lastOutbound(phone)).error_code).toBe('handed_off');
  await expect(row.getByRole('group', { name: messages.markSentManually })).toContainText(messages.handedOff);
}

test.describe('inbox — failed sends (R-MSG-03, R-MSG-05)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('failed → error in words, push row → «حاول مرة أخرى» → sent', async ({ asRole }) => {
    test.setTimeout(150_000);
    const f = await failedReply(await asRole('admin'), 'فشل');
    const failed = await lastOutbound(f.phone);
    expect([failed.status, failed.error_code]).toEqual(['failed', String(CODE)]);
    await expect.poll(() => pushesForMessage({ messageId: failed.id, kind: 'reminder_failed' })).toBeGreaterThan(0);
    await f.row.getByRole('button', { name: messages.retry }).click();
    await expect.poll(async () => (await lastOutbound(f.phone)).status, WAIT).toBe('sent');
    await expect.poll(async () => (await stubSent()).filter((m) => m.type === 'text').length, WAIT).toBe(1);
    await expect(f.row.getByRole('img', { name: ar.enums.messageStatus.sent, exact: true })).toBeVisible({ timeout: 30_000 });
  });

  test('failed → wa.me hand-off holds the row → «أرسلتها بنفسي» → sent manually', async ({ asRole }) => {
    test.setTimeout(150_000);
    const f = await failedReply(await asRole('admin'), 'يدوي');
    await handOff(f);
    await f.row.getByRole('group', { name: messages.markSentManually }).getByRole('button', { name: messages.markSentManually }).click();
    await expect.poll(async () => (await lastOutbound(f.phone)).status).toBe('sent_manually');
    const done = await lastOutbound(f.phone);
    expect(done.sent_manually_at).not.toBeNull();
    await expect(f.row.getByRole('img', { name: ar.enums.messageStatus.sent_manually, exact: true })).toBeVisible({ timeout: 30_000 });
    expect((await stubSent()).filter((m) => m.type === 'text')).toHaveLength(0); // never sent by the platform
  });

  test('hand-off → «لا، أعدها إلى الطابور» → back in the queue and sent', async ({ asRole }) => {
    test.setTimeout(150_000);
    const f = await failedReply(await asRole('admin'), 'تراجع');
    await handOff(f);
    await f.row.getByRole('button', { name: messages.undoHandOff }).click();
    await expect.poll(async () => (await lastOutbound(f.phone)).status, WAIT).toBe('sent');
    expect(await outboundRows(f.phone)).toHaveLength(1); // the same row, not a new one
    await expect.poll(async () => (await stubSent()).filter((m) => m.type === 'text').length, WAIT).toBe(1);
  });
});
