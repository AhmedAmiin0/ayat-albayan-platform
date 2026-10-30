import { ar, expect, test } from '../support/fixtures';
import { apiStatus } from '../support/messages';
import { thisMonthStart } from '../support/finance/money-extra';
import { openNav } from '../support/nav';
import { withSql } from '../support/schedule';

// «سجل النشاط» (owner, 2026-10-05): the admin adds an expense; the API's ActivityInterceptor logs
// it (flushed within a few seconds) and it shows on /admin/activity with its Arabic label and
// result. A teacher can neither open the page nor read GET /activity.

const NOTE = `سجل e2e ${Date.now() % 100_000}`;

async function loggedCreates(): Promise<number> {
  const rows = await withSql((sql) => sql<{ n: number }[]>`
    select count(*)::int as n from public.activity_log
    where action = 'expenses.create' and status = 201 and route = '/expenses'`);
  return rows[0]?.n ?? 0;
}

test.describe('activity log («سجل النشاط»)', () => {
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.expenses where note = ${NOTE}`);
  });

  test('an admin change appears in the log; a teacher has no access', async ({ asRole }) => {
    const before = await loggedCreates();
    const page = await asRole('admin');
    await page.goto(`/admin/expenses?month=${thisMonthStart().slice(0, 7)}`);
    await page.getByRole('button', { name: ar.expenses.add }).click();
    const form = page.getByRole('dialog', { name: ar.expenses.add });
    await form.getByLabel(ar.expenses.category, { exact: true }).selectOption('ads');
    await form.getByLabel(ar.expenses.amount, { exact: true }).fill('120');
    await form.getByLabel(ar.expenses.note, { exact: true }).fill(NOTE);
    await form.getByRole('button', { name: ar.common.save }).click();
    await expect(page.getByRole('status')).toHaveText(ar.expenses.saved);

    // Written fire-and-forget in batches: give the writer its few seconds.
    await expect.poll(loggedCreates, { timeout: 15_000 }).toBeGreaterThan(before);

    await (await openNav(page)).getByRole('link', { name: ar.nav.activity }).click();
    await expect(page).toHaveURL(/\/admin\/activity$/);
    await expect(page.getByRole('heading', { level: 1, name: ar.activity.title })).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: ar.activity.actions.expenses.create }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(ar.activity.ok);
    await expect(row).toContainText(ar.activity.roles.admin);

    // Server filter in the URL: failed actions only → the create is not among them.
    await page.goto('/admin/activity?f_result=error');
    await expect(page.getByRole('row').filter({ hasText: ar.activity.actions.expenses.create })).toHaveCount(0);

    const teacher = await asRole('teacher');
    await teacher.goto('/admin/activity');
    await expect(teacher).toHaveURL(/\/login$/);
    expect(await apiStatus(teacher, '/activity')).toBe(403);
  });
});
