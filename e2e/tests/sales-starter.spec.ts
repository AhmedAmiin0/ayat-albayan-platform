import type { Page } from '@playwright/test';
import { makeAssistant } from '../support/assistant-api';
import { ar, expect, test } from '../support/fixtures';
import { API, freshDigits } from '../support/messages';
import { dropTemplate, signInSales } from '../support/sales-portal';
import { withSql } from '../support/schedule';
import { CHAT_PN, messagesWithLine, NOTIF_PN, sentVia, SINGLE_LINE } from '../support/wa-lines';
import { setMessaging, stubReset } from '../support/wa-stub';

// Chat starters (owner 2026-10-12): «راجع حالة القوالب» imports the chat number's approved template
// (the stub's academy_welcome, only on the chat WABA) as a sales starter; sales are offered only
// starters, and the starter leaves from the chat number. The admin can untick it again.

const KEY = 'academy_welcome';
const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const t = ar.templates;
const composer = ar.inbox.composer;

async function starterRow(key: string): Promise<{ line: string; sales_starter: boolean } | undefined> {
  const [row] = await withSql((sql) => sql<{ line: string; sales_starter: boolean }[]>`
    select line, sales_starter from public.message_templates where key = ${key}`);
  return row;
}

async function checkHealth(admin: Page): Promise<void> {
  await admin.goto('/admin/settings');
  await admin.getByRole('button', { name: t.checkHealth }).click();
  await expect(admin.getByText(t.checkedNow)).toBeVisible();
}

const salesKeys = async (token: string): Promise<string[]> => {
  const res = await fetch(`${API}/messaging/templates`, { headers: { authorization: `Bearer ${token}` } });
  return ((await res.json()) as { key: string }[]).map((r) => r.key);
};

test.describe('sales chat starters (owner 2026-10-12)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so nothing is imported');
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await dropTemplate(KEY); // the boot check (or the other project's run) may have imported it already
  });
  test.afterEach(async () => {
    await setMessaging(false);
    await dropTemplate(KEY);
  });

  test('imported ticked from the chat line, offered alone to sales, sent from the chat number, then unticked', async ({ asRole, browser }) => {
    test.setTimeout(150_000);
    const admin = await asRole('admin');
    await checkHealth(admin);
    const row = admin.getByRole('row').filter({ hasText: KEY });
    await expect(row).toContainText(ar.enums.waLine.chat);
    const toggle = row.getByRole('checkbox', { name: t.salesStarterFor.replace('{name}', KEY) });
    await expect(toggle).toBeChecked();
    await expect(row.getByRole('button', { name: t.submit })).toHaveCount(0);
    expect(await starterRow(KEY)).toEqual({ line: 'chat', sales_starter: true });

    // Sales: «محادثة جديدة» offers the starter, not the booking templates.
    const me = await makeAssistant(`st${test.info().project.name}`);
    const page = await signInSales(browser, me.email);
    const digits = freshDigits();
    await page.goto('/sales/inbox');
    await page.getByText(ar.inbox.newChat.title, { exact: true }).click();
    await page.getByLabel(ar.inbox.newChat.phone).fill(`+${digits}`);
    await page.getByRole('button', { name: ar.inbox.newChat.open }).click();
    const select = page.getByLabel(composer.chooseTemplate);
    await expect(select.locator('option')).toContainText([KEY]);
    expect(await select.locator('option').allTextContents()).not.toContain(t.names.booking_confirmation_plain);
    await select.selectOption({ label: KEY });
    await page.getByLabel(composer.param.replace('{n}', '1'), { exact: true }).fill('أم سارة');
    await page.getByRole('button', { name: composer.sendTemplate, exact: true }).click();

    // It leaves from the chat number (the chat WABA's own template), stamped chat.
    await expect.poll(async () => (await sentVia(CHAT_PN)).filter((m) => m.to === digits && m.template === KEY).length, WAIT).toBe(1);
    expect((await sentVia(NOTIF_PN)).filter((m) => m.to === digits)).toHaveLength(0);
    await expect.poll(async () => (await messagesWithLine(`+${digits}`)).find((m) => m.template_key === KEY), WAIT).toEqual(
      expect.objectContaining({ line: 'chat', status: 'sent' }),
    );

    // The admin unticks it: sales no longer list it.
    await toggle.click();
    await expect(admin.getByText(t.starterOff)).toBeVisible();
    await expect(toggle).not.toBeChecked();
    expect(await starterRow(KEY)).toEqual({ line: 'chat', sales_starter: false });
    expect(await salesKeys(me.token)).not.toContain(KEY);
  });
});
