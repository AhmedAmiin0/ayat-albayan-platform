import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { riyadhToday, summaryOf, thisMonthStart } from '../../support/finance/money-extra';
import { withSql } from '../../support/schedule';

// Expenses (R-RPT-02, issue E4) on /admin/expenses for this month: add (ads, SAR = the reporting
// currency, so no fx), edit the amount, delete. The rows, the total, the expenses table and the
// dashboard's expenses / gross margin all follow. «تعديل» is both the row button and the dialog title.

const NOTE = `حملة e2e ${Date.now() % 100_000}`;
const range = () => ({ from: thisMonthStart(), to: riyadhToday() });

async function rowsInDb(): Promise<{ category: string; amount: number; currency: string; note: string | null }[]> {
  return withSql((sql) => sql<{ category: string; amount: number; currency: string; note: string | null }[]>`
    select category, amount::float as amount, currency, note from public.expenses where month = ${thisMonthStart()}`);
}

const total = (page: Page) => page.locator('p', { hasText: ar.expenses.total });
const row = (page: Page) => page.getByRole('row').filter({ hasText: NOTE });

test.describe('expenses (R-RPT-02)', () => {
  test.beforeEach(async () => {
    await withSql((sql) => sql`delete from public.expenses where month = ${thisMonthStart()}`);
  });
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.expenses where month = ${thisMonthStart()}`);
  });

  test('add, edit and delete an expense; the total and the dashboard margin follow', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto(`/admin/expenses?month=${thisMonthStart().slice(0, 7)}`);
    await expect(page.getByText(ar.expenses.empty)).toBeVisible();
    const base = (await summaryOf(page, range())).finance;

    // Add: ads, 300 SAR.
    await page.getByRole('button', { name: ar.expenses.add }).click();
    const form = page.getByRole('dialog', { name: ar.expenses.add });
    await form.getByLabel(ar.expenses.category, { exact: true }).selectOption('ads');
    await form.getByLabel(ar.expenses.amount, { exact: true }).fill('300');
    await form.getByLabel(ar.expenses.currency, { exact: true }).selectOption('SAR');
    await form.getByLabel(ar.expenses.note, { exact: true }).fill(NOTE);
    await form.getByRole('button', { name: ar.common.save }).click();
    await expect(page.getByRole('status')).toHaveText(ar.expenses.saved);
    await expect(row(page)).toContainText(ar.enums.expenseCategory.ads);
    await expect(row(page)).toContainText('300');
    await expect(total(page)).toContainText('300');
    expect(await rowsInDb()).toEqual([{ category: 'ads', amount: 300, currency: 'SAR', note: NOTE }]);

    // The dashboard's expenses and gross margin move by exactly the amount.
    const added = (await summaryOf(page, range())).finance;
    expect(added.expenses - base.expenses).toBeCloseTo(300, 2);
    expect(added.gross_margin - base.gross_margin).toBeCloseTo(-300, 2);

    // Edit: 450.
    await row(page).getByRole('button', { name: ar.common.edit }).click();
    const edit = page.getByRole('dialog', { name: ar.common.edit });
    await edit.getByLabel(ar.expenses.amount, { exact: true }).fill('450');
    await edit.getByRole('button', { name: ar.common.save }).click();
    await expect(row(page)).toContainText('450');
    await expect(total(page)).toContainText('450');
    expect((await rowsInDb())[0]?.amount).toBe(450);
    const edited = (await summaryOf(page, range())).finance;
    expect(edited.expenses - base.expenses).toBeCloseTo(450, 2);

    // Delete: asked first, then the month is empty again and the margin is back.
    await row(page).getByRole('button', { name: ar.common.delete }).click();
    const confirm = page.getByRole('dialog', { name: ar.expenses.deleteConfirm });
    await confirm.getByRole('button', { name: ar.common.delete }).click();
    await expect(page.getByText(ar.expenses.empty)).toBeVisible();
    expect(await rowsInDb()).toEqual([]);
    const gone = (await summaryOf(page, range())).finance;
    expect(gone.expenses).toBeCloseTo(base.expenses, 2);
    expect(gone.gross_margin).toBeCloseTo(base.gross_margin, 2);
  });
});
