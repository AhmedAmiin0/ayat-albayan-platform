import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { riyadhToday, summaryOf, type Summary } from '../support/money-extra';
import { kpiCounts, money, removeDashboardExpense, seedDashboard, weekOf } from '../support/money-dashboard';
import { addDays, resetAbrar } from '../support/schedule';

// Dashboard (R-RPT-01/02): the numbers on /admin are the statuses in the database. The DB is shared
// with other journeys, so seeded data is checked as a DELTA of GET /dashboard/summary (before →
// after) and every tile/row on the page must equal the API (or SQL) figure. All from one source,
// «صديق أو معرفة». Teacher cost is EGP with no fx row here, so only the margin identity is checked.

const SAR = ar.pricing.currencies.SAR;
const today = riyadhToday();
const period = { from: addDays(today, -3), to: today };

const cell = (row: Locator, n: number) => row.getByRole('cell').nth(n);
const figure = (page: Page, label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd');
const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ has: page.getByRole('rowheader', { name }) });

test.describe('dashboard numbers (R-RPT-01/02)', () => {
  test.afterEach(removeDashboardExpense);

  test('KPIs, funnel, lessons by status, teacher load, finance and source equal the data; the period filter re-queries', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const page = await asRole('admin');
    const [before, weekBefore] = [await summaryOf(page, period), await summaryOf(page, weekOf())];
    const seed = await seedDashboard(teacherId);
    const [after, week] = [await summaryOf(page, period), await summaryOf(page, weekOf())];

    // Deltas of what was seeded (API ↔ seed).
    const d = (pick: (s: Summary) => number) => pick(after) - pick(before);
    expect(d((s) => s.funnel['new'] ?? 0)).toBe(1);
    expect(d((s) => s.funnel['trial_booked'] ?? 0)).toBe(1);
    expect(d((s) => s.funnel['converted'] ?? 0)).toBe(1);
    expect(d((s) => s.unpaid_subscriptions)).toBe(1);
    expect(d((s) => s.pending_reports)).toBeGreaterThanOrEqual(4); // both packages: a past + a started lesson
    expect(week.lessons_by_status['confirmed']).toBe((weekBefore.lessons_by_status['confirmed'] ?? 0) + 1);
    expect(week.lessons_by_status['no_show']).toBe((weekBefore.lessons_by_status['no_show'] ?? 0) + 1);
    expect(d((s) => s.finance.revenue)).toBeCloseTo(seed.price, 2);
    expect(d((s) => s.finance.expenses)).toBeCloseTo(seed.expense, 2);
    const f = after.finance;
    expect(f.gross_margin).toBeCloseTo(f.revenue - f.teacher_cost - f.expenses, 1);
    const src = (s: Summary) => s.finance.by_source.find((r) => r.source === 'referral');
    expect((src(after)?.revenue ?? 0) - (src(before)?.revenue ?? 0)).toBeCloseTo(seed.price, 2);
    expect((src(after)?.leads ?? 0) - (src(before)?.leads ?? 0)).toBe(3);
    expect((src(after)?.converted ?? 0) - (src(before)?.converted ?? 0)).toBe(1);

    // The page shows exactly those numbers.
    await page.goto(`/admin?from=${period.from}&to=${period.to}`);
    const strip = page.getByRole('navigation', { name: ar.dashboard.kpiStrip });
    const sql = await kpiCounts();
    expect(after.unpaid_subscriptions).toBe(sql.unpaid);
    expect(after.open_tasks).toBe(sql.tasks);
    await expect(strip.getByRole('link', { name: new RegExp(`^${after.pending_reports} ${ar.dashboard.pendingReports}`) })).toBeVisible();
    await expect(strip.getByRole('link', { name: new RegExp(`^${sql.tasks} ${ar.dashboard.tasks}`) })).toBeVisible();
    await expect(strip.getByRole('link', { name: new RegExp(`^${sql.unpaid} ${ar.dashboard.unpaidSubscriptions}`) })).toBeVisible();

    const reached = (...keys: string[]) => keys.reduce((n, k) => n + (after.funnel[k] ?? 0), 0);
    const all = Object.values(after.funnel).reduce((n, v) => n + v, 0);
    await expect(cell(rowOf(page, ar.dashboard.leadsInRange), 0)).toHaveText(String(all));
    await expect(cell(rowOf(page, ar.enums.leadStatus.trial_booked), 0)).toHaveText(String(reached('trial_booked', 'trial_done', 'converted')));
    await expect(cell(rowOf(page, ar.enums.leadStatus.converted), 0)).toHaveText(String(reached('converted')));

    await expect(cell(rowOf(page, ar.enums.lessonStatus.confirmed), 0)).toHaveText(String(week.lessons_by_status['confirmed']));
    await expect(cell(rowOf(page, ar.enums.lessonStatus.no_show), 0)).toHaveText(String(week.lessons_by_status['no_show']));
    const load = week.teacher_load.find((r) => r.display_name_ar === 'أبرار');
    expect(load?.lessons).toBeGreaterThanOrEqual(3);
    await expect(cell(rowOf(page, 'أبرار'), 1)).toHaveText(String(load?.lessons));

    await expect(figure(page, ar.dashboard.revenue)).toContainText(`${money(f.revenue)} ${SAR}`);
    await expect(figure(page, ar.dashboard.expenses)).toContainText(`${money(f.expenses)} ${SAR}`);
    await expect(figure(page, ar.dashboard.grossMargin)).toContainText(`${money(f.gross_margin)} ${SAR}`);
    const source = rowOf(page, ar.enums.leadSource.referral);
    await expect(cell(source, 0)).toHaveText(String(src(after)?.leads));
    await expect(cell(source, 1)).toHaveText(String(src(after)?.converted));
    await expect(cell(source, 3)).toContainText(money(src(after)?.revenue ?? 0));

    // Narrowing the period to today re-queries: the figures follow the API for that range.
    const narrow = await summaryOf(page, { from: today, to: today });
    const form = page.getByRole('form', { name: ar.dashboard.range });
    await form.getByLabel(ar.dashboard.from, { exact: true }).fill(today);
    await form.getByLabel(ar.dashboard.to, { exact: true }).fill(today);
    await form.getByRole('button', { name: ar.common.search }).click();
    await expect(page).toHaveURL(new RegExp(`from=${today}&to=${today}|to=${today}&from=${today}`));
    await expect(figure(page, ar.dashboard.revenue)).toContainText(`${money(narrow.finance.revenue)} ${SAR}`);
    await expect(figure(page, ar.dashboard.expenses)).toContainText(`${money(narrow.finance.expenses)} ${SAR}`);
  });
});
