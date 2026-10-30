import { ar, expect, test } from '../../support/core/fixtures';
import { CHAT_PN, SINGLE_LINE, stubLineHealth } from '../../support/messaging/wa-lines';
import { stubReset } from '../../support/wa-stub';

// «افحص الخطوط» end to end (docs/12 §13.9–13.10, R-MSG-05, review C S2): LinesController →
// LinesCheck → the stub's Graph diagnostics → the Lines card on «التواصل» › «الأرقام». Both lines run in
// e2e (playwright.config.ts E2E_WA / E2E_WA_CHAT), each with its own Meta app id.

const s = ar.templates.settings.lines;

test.describe('settings — WhatsApp lines check', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line is configured');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one run: the card has no phone-specific layout');
    await stubReset();
  });
  test.afterEach(async () => {
    await stubReset(); // restores every line to healthy and subscribed
  });

  test('both lines configured and subscribed to our app; an unsubscribed chat WABA is flagged', async ({ asRole }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/settings/communications?tab=numbers');
    await expect(admin.getByText(s.title, { exact: true })).toBeVisible();
    await expect(admin.getByText(s.notChecked, { exact: true })).toBeVisible(); // nothing fetched on mount

    const check = admin.getByRole('button', { name: s.check, exact: true });
    const notifications = admin.locator('[data-testid="line-row"][data-line="notifications"]');
    const chat = admin.locator('[data-testid="line-row"][data-line="chat"]');

    await check.click();
    for (const row of [notifications, chat]) {
      await expect(row.getByText(s.configured, { exact: true })).toBeVisible();
      const webhook = row.locator('[data-tone]', { hasText: s.subscribed });
      await expect(webhook).toBeVisible();
      await expect(webhook).toHaveAttribute('data-tone', 'ok');
      await expect(row.getByText(s.notSubscribed)).toHaveCount(0);
    }
    await expect(admin.getByText(s.notChecked, { exact: true })).toHaveCount(0);

    // The good number is kept (docs/23 phase 1): after a fresh load «الإشعارات» shows it with no new check.
    await admin.goto('/admin/settings/communications?tab=catalogue');
    const catalogue = admin.getByRole('region', { name: ar.notificationRules.title, exact: true });
    await expect(catalogue.getByText('+15550001111').filter({ visible: true }).first()).toBeVisible();
    await admin.getByRole('tab', { name: ar.settingsPages.communicationsTabs.numbers, exact: true }).click();
    await expect(admin.getByText(s.notChecked, { exact: true })).toBeVisible();

    // The chat WABA loses its app subscription: only the chat row asks the admin to act.
    await stubLineHealth(CHAT_PN, { subscribed: false });
    await check.click();
    const lost = chat.locator('[data-tone]', { hasText: s.notSubscribed });
    await expect(lost).toBeVisible();
    await expect(lost).toHaveAttribute('data-tone', 'act');
    await expect(chat.getByText(s.configured, { exact: true })).toBeVisible();
    await expect(notifications.locator('[data-tone]', { hasText: s.subscribed })).toHaveAttribute('data-tone', 'ok');
    await expect(notifications.getByText(s.notSubscribed)).toHaveCount(0);
  });
});
