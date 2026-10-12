import { makeAssistant } from '../support/assistant-api';
import { ar, expect, test } from '../support/fixtures';
import { freshDigits } from '../support/messages';
import { chatRows, dropChatRows, importChatRows, listedKeys, RESTRICTED, sendAs, UNFLAGGED } from '../support/restricted-templates';
import { signInSales } from '../support/sales-portal';
import { CHAT_PN, messagesWithLine, NOTIF_PN, sentVia, SINGLE_LINE } from '../support/wa-lines';
import { setMessaging, stubReset } from '../support/wa-stub';

// The restricted allow-list (owner 2026-10-12: «all roles except the ones allowed to have all
// templates»): «راجع حالة القوالب» imports the chat number's approved templates and flags only
// free_trial_invite and welcome_greeting; sales are offered only those, they leave from the chat
// number, and the admin's switch changes the list (the sync never re-flags).

const KEY = 'free_trial_invite';
const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const t = ar.templates;
const composer = ar.inbox.composer;
const sorted = (keys: readonly string[]) => [...keys].sort();

test.describe('restricted templates for sales (owner 2026-10-12)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so nothing is imported (as on staging)');
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await dropChatRows();
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('only the two defaults come flagged; sales list and send only them, from the chat number; the admin’s switch rules', async ({ asRole, browser }) => {
    test.setTimeout(150_000);
    const admin = await asRole('admin');
    await importChatRows(admin);
    expect(await chatRows()).toEqual([
      { key: UNFLAGGED, line: 'chat', sales_starter: false },
      { key: 'free_trial_invite', line: 'chat', sales_starter: true },
      { key: 'welcome_greeting', line: 'chat', sales_starter: true },
    ]);
    const toggleOf = (key: string) =>
      admin.getByRole('row').filter({ hasText: key }).getByRole('checkbox', { name: t.salesStarterFor.replace('{name}', key) });
    await expect(toggleOf(KEY)).toBeChecked();
    await expect(toggleOf(UNFLAGGED)).not.toBeChecked();

    // Sales: exactly the two, by API and in «محادثة جديدة»; anything else is 403 template_not_allowed.
    const me = await makeAssistant(`rt${test.info().project.name}`);
    expect(sorted(await listedKeys(me.token))).toEqual(sorted(RESTRICTED));
    const digits = freshDigits();
    expect(await sendAs({ token: me.token, phone: `+${digits}`, key: 'booking_confirmation_plain' })).toEqual({ status: 403, code: 'template_not_allowed' });
    const page = await signInSales(browser, me.email);
    await page.goto('/sales/inbox');
    await page.getByText(ar.inbox.newChat.title, { exact: true }).click();
    await page.getByLabel(ar.inbox.newChat.phone).fill(`+${digits}`);
    await page.getByRole('button', { name: ar.inbox.newChat.open }).click();
    const select = page.getByLabel(composer.chooseTemplate);
    await expect(select.locator('option')).toHaveCount(1 + RESTRICTED.length);
    expect(sorted(await select.locator('option').allTextContents())).toEqual(sorted(['—', ...RESTRICTED]));
    await select.selectOption({ label: KEY });
    await page.getByLabel(composer.param.replace('{n}', '1'), { exact: true }).fill('أم سارة');
    await page.getByRole('button', { name: composer.sendTemplate, exact: true }).click();

    // It leaves from the chat number (the chat WABA's own template), stamped chat.
    await expect.poll(async () => (await sentVia(CHAT_PN)).filter((m) => m.to === digits && m.template === KEY).length, WAIT).toBe(1);
    expect((await sentVia(NOTIF_PN)).filter((m) => m.to === digits)).toHaveLength(0);
    await expect.poll(async () => (await messagesWithLine(`+${digits}`)).find((m) => m.template_key === KEY), WAIT).toEqual(
      expect.objectContaining({ line: 'chat', status: 'sent' }),
    );

    // The admin unticks welcome_greeting and ticks academy_welcome: the list follows; a new sync keeps it.
    await toggleOf('welcome_greeting').click();
    await expect(admin.getByText(t.starterOff)).toBeVisible();
    await toggleOf(UNFLAGGED).click();
    await expect(admin.getByText(t.starterOn)).toBeVisible();
    expect(sorted(await listedKeys(me.token))).toEqual(sorted([KEY, UNFLAGGED]));
    await admin.getByRole('button', { name: t.checkHealth }).click();
    await expect(admin.getByText(t.checkedNow)).toBeVisible();
    expect(sorted(await listedKeys(me.token))).toEqual(sorted([KEY, UNFLAGGED]));
  });
});
