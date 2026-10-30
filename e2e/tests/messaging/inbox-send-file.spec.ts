import { AVATAR_PNG } from '../../support/account';
import { makeAssistant } from '../../support/sales/assistant-api';
import { ar, expect, test } from '../../support/core/fixtures';
import { backdateInbound, bubble, inboundRows, lastOutbound } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/core/messages';
import { signInSales } from '../../support/sales/sales-portal';
import { setMessaging, stubInbound, stubReset, stubSent } from '../../support/core/wa-stub';

// docs/21 D2 (R-MSG-03): inside the 24 h window the assistant attaches an image in her chat, adds a
// caption and sends it. It is stored in wa-media under her name, leaves «Meta» (tools/wa-stub) as
// type image by link, and its bubble opens it like an inbound photo. A closed window hides the paperclip.

const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const c = ar.inbox.composer;

test.describe('inbox — the assistant sends a file (docs/21 D2)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('a PNG with a caption → type image by link, her name on the bubble, «عرض صورة» opens it', async ({ browser }) => {
    test.setTimeout(150_000);
    const me = await makeAssistant(`sf${test.info().project.name}`);
    const digits = freshDigits();
    const phone = `+${digits}`;
    expect((await stubInbound({ from: digits, name: `أم ريم ${digits.slice(-4)}`, text: 'السلام عليكم' })).status).toBe(200);

    const page = await signInSales(browser, me.email);
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(phone)}`);
    const log = page.getByRole('log', { name: ar.messages.log });
    await expect(log).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: c.attach })).toBeVisible();
    // The paperclip opens a hidden file input; Playwright sets the file on it directly.
    await page.locator('input[type="file"][accept*="image/png"]').setInputFiles(AVATAR_PNG);
    const caption = `صورة الجدول ${digits.slice(-4)}`;
    await page.getByPlaceholder(c.captionPlaceholder).fill(caption);
    await page.getByRole('button', { name: c.sendFile, exact: true }).click();

    const images = async () => (await stubSent()).filter((m) => m.to === digits && m.type === 'image');
    await expect.poll(async () => (await images()).length, WAIT).toBe(1);
    const [sent] = await images();
    expect(sent?.body).toEqual(expect.objectContaining({ image: expect.objectContaining({ link: expect.stringMatching(/^https?:\/\//), caption }) }));
    await expect.poll(async () => (await lastOutbound(phone)).status, WAIT).toBe('sent');
    expect((await lastOutbound(phone)).created_by).toBe(me.id);

    const row = bubble(log, caption);
    await expect(row).toContainText(ar.inbox.sentBy.replace('{name}', `مسؤولة مبيعات sf${test.info().project.name}`));
    await row.getByRole('button', { name: ar.inbox.viewMedia.replace('{kind}', ar.inbox.media.image) }).click();
    const thumb = row.getByRole('img', { name: ar.inbox.openMedia.replace('{kind}', ar.inbox.media.image) });
    await expect.poll(() => thumb.evaluate((i) => (i as unknown as { naturalWidth: number }).naturalWidth), { timeout: 30_000 }).toBeGreaterThan(0);
  });

  test('a closed 24 h window hides «أرفق صورة أو ملف PDF»', async ({ browser }) => {
    test.setTimeout(90_000);
    const me = await makeAssistant(`sfc${test.info().project.name}`);
    const digits = freshDigits();
    const phone = `+${digits}`;
    expect((await stubInbound({ from: digits, name: `أم هند ${digits.slice(-4)}`, text: 'السلام عليكم' })).status).toBe(200);
    await expect.poll(async () => (await inboundRows(phone)).length).toBe(1);
    await backdateInbound({ phone, hoursAgo: 25 });

    const page = await signInSales(browser, me.email);
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(phone)}`);
    // The thread has loaded (its inbound bubble shows) before the paperclip's absence is checked.
    await expect(bubble(page.getByRole('log', { name: ar.messages.log }), 'السلام عليكم')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: c.attach })).toHaveCount(0);
  });
});
