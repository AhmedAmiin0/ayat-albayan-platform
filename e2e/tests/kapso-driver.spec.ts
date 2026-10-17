import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { openThread } from '../support/inbox';
import { kapsoInbound, stubRequests, switchNotifications } from '../support/kapso';
import { freshDigits, messagesFor } from '../support/messages';
import { clearQueue } from '../support/settings';
import { NOTIF_PN, sentVia } from '../support/wa-lines';
import { setMessaging, stubReset } from '../support/wa-stub';

// The kapso driver end to end (docs/19): with the notifications line switched to kapso, an inbound
// arrives through POST /webhooks/kapso (Kapso-signed raw Meta payload) and shows in the inbox, and
// a staff reply leaves through the stub's Kapso prefix with X-API-Key, never a bearer. A bad
// signature is 401 and stores nothing. Provider meta is ALWAYS restored, so other specs are unaffected.

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
      await switchNotifications(await asRole('admin'), 'meta');
    } finally {
      await setMessaging(false);
    }
  });

  test('inbound via /webhooks/kapso, reply via Kapso with X-API-Key', async ({ asRole }) => {
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
  });

  test('a bad Kapso signature is 401 and stores nothing', async ({ asRole }) => {
    await onKapso(await asRole('admin'));
    const digits = freshDigits();
    const res = await kapsoInbound({ from: digits, text: 'رسالة بتوقيع خاطئ', signWith: 'e2e-wrong-kapso-secret' });
    expect(res.status).toBe(401);
    expect(await messagesFor(`+${digits}`)).toEqual([]);
  });
});
