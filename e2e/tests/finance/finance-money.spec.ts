import { ar, expect, test } from '../../support/core/fixtures';
import { openFilters, showResults } from '../../support/core/filters';
import { seedPackageStudent } from '../../support/finance/money';
import { uniqueName } from '../../support/finance/money-extra';
import { openNav } from '../../support/core/nav';
import { resetAbrar, withSql } from '../../support/schedule';

// «المالية» (owner, 2026-10-05): a part payment shows «مدفوع جزئيًا» and is found by that filter,
// the rest is owed on «مستحق على الطلاب»; a refund («استرداد») counts against what was paid;
// the money pages sit under «المالية» and the yearly summary renders.

const kinds = (subscriptionId: string) =>
  withSql((sql) => sql<{ kind: string; amount: number }[]>`
    select kind::text as kind, amount::float as amount from public.payments where subscription_id = ${subscriptionId} order by created_at`);

test.describe('finance: part payments, receivables, refunds', () => {
  test('part payment → «مدفوع جزئيًا» → owed on receivables → refund', async ({ asRole }) => {
    const student = uniqueName('ريم');
    const seed = await seedPackageStudent({ teacherId: await resetAbrar(), paid: false, guardian: 'أم ريم', student });
    const page = await asRole('admin');

    // Part payment from the subscriptions list.
    await page.goto('/admin/subscriptions');
    const row = page.getByRole('row').filter({ hasText: student });
    await row.getByRole('button', { name: ar.payments.record }).click();
    const pay = page.getByRole('dialog');
    await pay.getByLabel(new RegExp(ar.payments.amount)).fill('100');
    await pay.getByRole('button', { name: ar.payments.record, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);
    // Owner 2026-10-28: the status cell says what was paid and what is left («مدفوعة جزئيًا: 100 من …»).
    const partPaid = ar.packagePayment.partPaid.replace('{paid}', '100').split(' من ')[0] ?? '';
    await expect(row.getByText(partPaid)).toBeVisible();
    const filters = await openFilters(page);
    await filters.getByRole('combobox', { name: ar.subscriptions.status }).selectOption('partial');
    await showResults(filters);
    await expect(page.getByRole('row').filter({ hasText: student })).toBeVisible();

    // What is left is owed, with its aging.
    await page.goto('/admin/receivables');
    const owed = page.getByRole('row').filter({ hasText: student });
    await expect(owed).toContainText(String(seed.price - 100));

    // «استرداد» 40 of the 100: stored as kind refund, counted against what was paid.
    await page.goto('/admin/subscriptions');
    await page.getByRole('row').filter({ hasText: student }).getByRole('button', { name: ar.finance.refund }).click();
    const refund = page.getByRole('dialog', { name: ar.finance.refundTitle });
    await refund.getByLabel(new RegExp(ar.payments.amount)).fill('40');
    await refund.getByRole('button', { name: ar.finance.refund }).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);
    expect(await kinds(seed.subscriptionId)).toEqual([
      { kind: 'payment', amount: 100 },
      { kind: 'refund', amount: 40 },
    ]);
  });

  test('the money pages are grouped under «المالية»; the summary shows the year by month', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin/finance');
    const money = (await openNav(page)).getByRole('list', { name: ar.finance.nav, exact: true });
    for (const name of [ar.payments.title, ar.nav.subscriptions, ar.nav.payouts, ar.nav.expenses, ar.finance.invoicesTitle, ar.finance.receivablesTitle, ar.finance.summaryTitle])
      await expect(money.getByRole('link', { name, exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); // the «القائمة» sheet on phones; nothing on desktop
    await expect(page.getByRole('heading', { name: ar.finance.summaryTitle })).toBeVisible();
    await expect(page.getByText(ar.dashboard.grossMargin).first()).toBeVisible();
    await expect(page.getByRole('list', { name: ar.finance.moneyKpis }).getByRole('link', { name: new RegExp(ar.finance.receivablesKpi) })).toBeVisible();
  });
});
