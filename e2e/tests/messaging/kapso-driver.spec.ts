import type { Page } from '@playwright/test';
import { AVATAR_PNG } from '../../support/account';
import { ar, expect, test } from '../../support/core/fixtures';
import { openThread } from '../../support/messaging/inbox';
import { kapsoInbound, stubRequests, switchNotifications } from '../../support/messaging/kapso';
import { clearQueue } from '../../support/messaging/message-queue';
import { freshDigits, messagesFor } from '../../support/messages';
import { NOTIF_PN, sentVia } from '../../support/messaging/wa-lines';
import { setMessaging, stubReset } from '../../support/wa-stub';

// The kapso driver end to end (docs/19): with the notifications line switched to kapso, an inbound
// arrives through POST /webhooks/kapso (Kapso-signed raw Meta payload) and shows in the inbox, and
// a staff reply, and then a file (docs/21 D2), leave through the stub's Kapso prefix with X-API-Key, never a bearer. A bad
// signature is 401 and stores nothing. Provider meta is ALWAYS restored, so other specs are unaffected.
// Messaging opens only AFTER the switch and closes BEFORE the switch back: a row an earlier spec left
// queued can then only leave through Kapso, never through Meta inside this spec's window.

const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const MESSAGES = `/${NOTIF_PN}/messages`;

/**
 * Kapso first (switchNotifications waits for the lines check), then no leftover queued rows from
 * earlier specs and a clean stub log, and only then messaging on: nothing leaves under meta here.
 */
async function onKapso(admin: Page): Promise<void> {
  await switchNotifications(admin, 'kapso');
  await clearQueue();
  await stubReset();
  await setMessaging(true);
}

test.describe('WhatsApp driver: Kapso on the notifications line', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'one run: the driver has no phone-specific layout');
  });
  test.afterEach(async ({ asRole }) => {
    try {
      await setMessaging(false);
    } finally {
      await switchNotifications(await asRole('admin'), 'meta');
    }
  });

  test('inbound via /webhooks/kapso, reply and a file via Kapso with X-API-Key', async ({ asRole }) => {
    test.setTimeout(150_000);
    const admin = await asRole('admin');
    await onKapso(admin);
    const digits = freshDigits();
    const name = `كابسو ${digits.slice(-4)}`;
    expect((await kapsoInbound({ from: digits, name, text: 'السلام عليكم' })).status).toBe(200);
    await expect.poll(async () => (await messagesFor(`+${digits}`)).length, WAIT).toBe(1);

    await openThread(admin, name);
    const reply = `وعليكم السلام ${digits.slice(-4)}`;
    await admin.getByRole('textbox', { name: ar.inbox.composer.messageLabel }).fill(reply);
    await admin.getByRole('button', { name: ar.inbox.composer.send, exact: true }).click();

    const mine = async () => (await sentVia(NOTIF_PN)).filter((m) => m.to === digits && m.type === 'text');
    await expect.poll(async () => (await mine()).length, WAIT).toBe(1);
    expect((await mine()).map((m) => m.via)).toEqual(['kapso']);
    const sends = (await stubRequests()).filter((r) => r.method === 'POST' && r.path.endsWith(MESSAGES));
    for (const r of sends) expect(r).toEqual(expect.objectContaining({ via: 'kapso', auth: 'api-key' }));
    expect((await stubRequests()).filter((r) => r.via === 'kapso' && r.auth !== 'api-key')).toEqual([]);
    await expect.poll(async () => (await messagesFor(`+${digits}`)).filter((m) => m.direction === 'outbound'), WAIT).toEqual([
      expect.objectContaining({ body: reply, status: 'sent' }),
    ]);

    // docs/21 D2: a file leaves through Kapso with the same body as on Meta (type image, by link), X-API-Key.
    await admin.locator('input[type="file"][accept*="image/png"]').setInputFiles(AVATAR_PNG);
    await admin.getByRole('button', { name: ar.inbox.composer.sendFile, exact: true }).click();
    const images = async () => (await sentVia(NOTIF_PN)).filter((m) => m.to === digits && m.type === 'image');
    await expect.poll(async () => (await images()).length, WAIT).toBe(1);
    expect(await images()).toEqual([
      expect.objectContaining({ via: 'kapso', body: expect.objectContaining({ type: 'image', image: expect.objectContaining({ link: expect.any(String) }) }) }),
    ]);
    const all = (await stubRequests()).filter((r) => r.method === 'POST' && r.path.endsWith(MESSAGES));
    expect(all.length).toBeGreaterThanOrEqual(2);
    for (const r of all) expect(r).toEqual(expect.objectContaining({ via: 'kapso', auth: 'api-key' }));
  });

  test('a bad Kapso signature is 401 and stores nothing', async ({ asRole }) => {
    await onKapso(await asRole('admin'));
    const digits = freshDigits();
    const res = await kapsoInbound({ from: digits, text: 'رسالة بتوقيع خاطئ', signWith: 'e2e-wrong-kapso-secret' });
    expect(res.status).toBe(401);
    expect(await messagesFor(`+${digits}`)).toEqual([]);
  });
});
