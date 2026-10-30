import { ar, expect, test } from '../../support/fixtures';
import { inboundFor, leadsByPhone, pushesLike } from '../../support/messaging/inbound';
import { freshDigits } from '../../support/messages';
import { setMessaging, stubInbound, stubReset } from '../../support/wa-stub';

// An unknown number writes on WhatsApp (R-LEAD-01, R-MSG-04): the lead is created once, the text is
// stored as an unread inbound row, the admin gets one new_lead push, and the thread is in the inbox.

const POLL = { timeout: 30_000, intervals: [500, 1_000, 2_000] };

test.describe('inbound WhatsApp — a new lead', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('first message creates the lead + inbound row + push; a second one adds a row, not a lead', async ({
    asRole,
  }) => {
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `أم عمر ${digits.slice(-4)}`;
    const hello = 'السلام عليكم، عايزة أعرف تفاصيل الحلقات';
    expect((await stubInbound({ from: digits, name, text: hello })).status).toBe(200);

    await expect.poll(async () => (await leadsByPhone(phone)).length, POLL).toBe(1);
    const [lead] = await leadsByPhone(phone);
    const leadId = lead?.id ?? '';
    const leadPushes = () => pushesLike({ kind: 'new_lead', prefix: leadId });
    expect(lead?.name).toBe(name);
    expect(lead?.status).toBe('new');
    await expect.poll(async () => (await inboundFor(phone)).length, POLL).toBe(1);
    const [row] = await inboundFor(phone);
    expect(row).toMatchObject({ body: hello, status: 'delivered', lead_id: leadId, guardian_id: null });
    expect(row?.read_at).toBeNull(); // unread until an admin opens the thread
    await expect.poll(async () => (await leadPushes()).length, POLL).toBeGreaterThan(0);
    const [push, ...rest] = await leadPushes();
    const pushes = rest.length + 1; // one row per admin profile
    expect(push?.title).toBe(ar.notifications.new_lead.title);
    expect(push?.body).toContain(name);
    expect(push?.body).toContain(hello);

    // The same number again: one more message row, still one lead, no second new_lead push.
    const again = 'ممكن حلقة تجريبية لبنتي؟';
    await stubInbound({ from: digits, name, text: again });
    await expect.poll(async () => (await inboundFor(phone)).map((m) => m.body), POLL).toEqual([hello, again]);
    expect(await leadsByPhone(phone)).toHaveLength(1);
    expect(await leadPushes()).toHaveLength(pushes);

    // The inbox lists the thread; opening it shows both messages.
    const admin = await asRole('admin');
    await admin.goto('/admin/inbox');
    const open = admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', name) });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await open.click();
    const log = admin.getByRole('log', { name: ar.messages.log });
    await expect(log).toContainText(hello);
    await expect(log).toContainText(again);
    await expect.poll(async () => (await inboundFor(phone)).every((m) => m.read_at !== null), POLL).toBe(true);
  });
});
