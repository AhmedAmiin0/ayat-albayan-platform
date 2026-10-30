import { makeAssistant } from '../../support/sales/assistant-api';
import { fromChatMore } from '../../support/messaging/chat-more';
import { createListFromRow, dropListsLike, listChip, listsNamed, listsRow, messageCount } from '../../support/messaging/chat-lists';
import { ar, expect, test } from '../../support/fixtures';
import { inboundRows } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/messages';
import { signInSales } from '../../support/sales/sales-portal';
import { stubInbound, stubReset } from '../../support/wa-stub';

// docs/22 (owner 2026-10-20): «القوائم» like WhatsApp Business. An assistant creates «بانتظار الدفع»
// from the chip row, adds a chat to it from the thread's «القوائم», filters the conversations by the
// chip, renames the list and deletes it; the chat and its messages stay. Nothing is sent by a list.

const L = ar.inbox.lists;

test.describe('inbox — chat lists «القوائم» (docs/22)', () => {
  test.beforeEach(async () => {
    await stubReset();
  });

  test('create, add a chat from the thread, filter by the chip, rename, delete: the chat remains', async ({ browser }) => {
    test.setTimeout(150_000);
    const project = test.info().project.name;
    const name = `بانتظار الدفع ${project}`;
    const renamed = `مدفوع لاحقًا ${project}`;
    await dropListsLike(name);
    await dropListsLike(renamed);
    const me = await makeAssistant(`cl${project}`);
    const digits = freshDigits();
    const phone = `+${digits}`;
    const family = `أم سلمى ${digits.slice(-4)}`;
    expect((await stubInbound({ from: digits, name: family, text: 'السلام عليكم' })).status).toBe(200);
    await expect.poll(async () => (await inboundRows(phone)).length).toBe(1);

    const page = await signInSales(browser, me.email);
    await page.goto('/sales/inbox');
    await expect(listsRow(page).getByRole('button', { name: L.all })).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
    await createListFromRow(page, name);
    await expect(listChip(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(L.empty)).toBeVisible();

    // The thread's «القوائم»: tick the new list (saved at once), then its chip shows in the header.
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(phone)}`);
    await expect(page.getByRole('log', { name: ar.messages.log })).toBeVisible({ timeout: 30_000 });
    await fromChatMore(page, L.title);
    const dialog = page.getByRole('dialog', { name: L.title });
    await dialog.getByRole('checkbox', { name }).check();
    await expect.poll(async () => (await listsNamed(name))[0]?.members).toEqual([phone]);
    await dialog.getByRole('button', { name: ar.common.close }).first().click();
    await expect(page.getByRole('group', { name: L.chatLists }).getByRole('link', { name })).toBeVisible();

    // The chip row shows only that list's chats.
    await page.goto('/sales/inbox');
    await listChip(page, name).click();
    await expect(page).toHaveURL(/list=/);
    await expect(page.getByRole('link', { name: new RegExp(family) })).toBeVisible();
    await expect(listChip(page, name)).toContainText('1');

    // Rename, then delete behind its confirmation; the chats themselves stay.
    await page.getByRole('button', { name: L.editNamed.replace('{name}', name) }).click();
    await page.getByRole('dialog', { name: L.edit }).getByRole('textbox', { name: new RegExp(L.name) }).fill(renamed);
    await page.getByRole('button', { name: L.save, exact: true }).click();
    await expect(listChip(page, renamed)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: L.editNamed.replace('{name}', renamed) }).click();
    await page.getByRole('button', { name: L.delete, exact: true }).click();
    await expect(page.getByText(L.deleteNote)).toBeVisible();
    await page.getByRole('button', { name: L.deleteYes }).click();
    await expect(listsRow(page).getByRole('button', { name: L.all })).toHaveAttribute('aria-pressed', 'true');
    await expect(listChip(page, renamed)).toHaveCount(0);
    await expect(page.getByRole('link', { name: new RegExp(family) })).toBeVisible();
    expect(await listsNamed(renamed)).toEqual([]);
    expect(await messageCount(phone)).toBe(1);
  });
});
