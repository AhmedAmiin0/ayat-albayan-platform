import { ar, expect, test } from '../support/fixtures';
import { freshDigits, seedLead } from '../support/messages';
import {
  clearQueue, messageState, queueRenewal, queueText, queuedCount, restoreSettings, sentToDigits,
  settingText, snapshotSettings,
} from '../support/settings';
import { setMessaging, stubInbound, stubReset, stubSent } from '../support/wa-stub';

// /admin/settings switches (R-MSG-01, cut-over docs/09, docs/23 phase 2): the kill switch is the only
// switch for sending (no env fuse) and asks first both ways (ON names the queue); the automatic-messages
// switch asks first too and holds job-made rows as auto_off.

const s = ar.templates.settings;
const KEYS = ['messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done'];
/** The sender ticks every 30 s: wait past one tick. */
const SENDER_WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };

test.describe('settings switches — kill switch and automatic messages', () => {
  let saved: Awaited<ReturnType<typeof snapshotSettings>> = [];
  test.beforeEach(async () => {
    saved = await snapshotSettings(KEYS);
    await stubReset();
    await clearQueue(); // other specs leave queued rows: the count below must be exactly ours
    await setMessaging(false);
  });
  test.afterEach(async () => {
    await restoreSettings({ keys: KEYS, rows: saved });
    await setMessaging(false); // journeys 2–4 assert `queued`
  });

  test('kill switch: ON names the 2 queued messages and asks first, they go out; OFF is at once', async ({
    asRole,
  }) => {
    test.setTimeout(150_000);
    const digits = freshDigits();
    const leadId = await seedLead({ phone: `+${digits}`, name: `عميل ${digits.slice(-4)}` });
    // The stub only lets free text through within 24 h of an inbound it saw itself (131047).
    expect((await stubInbound({ from: digits, text: 'السلام عليكم' })).status).toBe(200);
    await queueText({ phone: `+${digits}`, leadId, body: 'أهلًا بحضرتك' });
    await queueText({ phone: `+${digits}`, leadId, body: 'تحب نحجز لك حلقة؟' });
    const admin = await asRole('admin');
    await admin.goto('/admin/settings');

    await expect(admin.getByText(s.off, { exact: true })).toBeVisible();
    await expect(admin.getByText(s.queued.two, { exact: true })).toBeVisible();
    await expect(admin.getByText(s.gateNotConfigured)).toHaveCount(0); // WhatsApp is set up (the stub)
    // «ماذا يُرسل ومتى» says the report PDF is held because sending is off (read-only, no switch).
    const report = admin.getByRole('region', { name: ar.notificationCatalogue.title }).locator('[data-key="report_ready"]');
    await expect(report.getByText(ar.notificationCatalogue.blockers.messaging_off)).toBeVisible();

    // Cancel is the way out: nothing changes.
    await admin.getByRole('button', { name: s.enableTitle, exact: true }).click();
    const dialog = admin.getByRole('dialog', { name: s.enableTitle });
    await expect(dialog).toContainText(s.queued.two);
    await expect(dialog).toContainText(s.queuedGoOut);
    await dialog.getByRole('button', { name: ar.common.cancel }).click();
    await expect(dialog).toBeHidden();
    expect(await settingText('messaging_enabled')).toBe('false');
    expect(await queuedCount()).toBe(2);

    await admin.getByRole('button', { name: s.enableTitle, exact: true }).click();
    await admin.getByRole('dialog', { name: s.enableTitle }).getByRole('button', { name: s.enableYes }).click();
    await expect(admin.getByText(s.on, { exact: true })).toBeVisible();
    expect(await settingText('messaging_enabled')).toBe('true');
    await expect
      .poll(async () => sentToDigits(await stubSent(), digits).length, SENDER_WAIT)
      .toBe(2);
    expect((await messageState(`+${digits}`)).map((m) => m.status)).toEqual(['sent', 'sent']);

    // OFF asks first too (cancel changes nothing); confirmed, the row is written before the next tick reads it.
    await admin.getByRole('button', { name: s.disable }).click();
    const off = admin.getByRole('dialog', { name: s.disableTitle });
    await off.getByRole('button', { name: ar.common.cancel }).click();
    expect(await settingText('messaging_enabled')).toBe('true');
    await admin.getByRole('button', { name: s.disable }).click();
    await admin.getByRole('dialog', { name: s.disableTitle }).getByRole('button', { name: s.disableYes }).click();
    await expect(admin.getByText(s.off, { exact: true })).toBeVisible();
    expect(await settingText('messaging_enabled')).toBe('false');
  });

  test('automatic messages: the switch saves ON and OFF, and OFF holds a job-made renewal as auto_off', async ({
    asRole,
  }) => {
    test.setTimeout(150_000);
    await restoreSettings({ keys: ['auto_messages_enabled'], rows: [{ key: 'auto_messages_enabled', value: false }] });
    const admin = await asRole('admin');
    await admin.goto('/admin/settings');
    await expect(admin.getByText(s.autoOff, { exact: true })).toBeVisible();

    await admin.getByRole('button', { name: s.autoEnable }).click();
    await admin.getByRole('dialog', { name: s.autoEnable }).getByRole('button', { name: s.autoEnableYes }).click();
    await expect(admin.getByText(s.autoOn, { exact: true })).toBeVisible();
    expect(await settingText('auto_messages_enabled')).toBe('true');
    await admin.getByRole('button', { name: s.autoDisable }).click();
    await admin.getByRole('dialog', { name: s.autoDisable }).getByRole('button', { name: s.autoDisableYes }).click();
    await expect(admin.getByText(s.autoOff, { exact: true })).toBeVisible();
    expect(await settingText('auto_messages_enabled')).toBe('false');

    // The gate is open but automatic is OFF: the renewal reminder is failed «auto_off», never sent.
    const digits = freshDigits();
    await queueRenewal({ phone: `+${digits}`, dedupKey: `renewal_due:e2e:${digits}` });
    await setMessaging(true);
    await expect
      .poll(async () => (await messageState(`+${digits}`)).map((m) => m.error_code), SENDER_WAIT)
      .toEqual(['auto_off']);
    expect((await messageState(`+${digits}`)).map((m) => m.status)).toEqual(['failed']);
    expect(sentToDigits(await stubSent(), digits)).toHaveLength(0);
  });
});
