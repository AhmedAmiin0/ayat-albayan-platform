import { ar, expect, test } from '../../support/core/fixtures';
import { removeDashboardExpense, seedDashboard } from '../../support/finance/money-dashboard';
import { resetAbrar } from '../../support/schedule';

// Design review, 2026-10-05: keyboard focus must stay visible and reachable in the admin shell.
// Each test sizes its own viewport, so it runs once (desktop project).

test.describe('admin shell: keyboard focus', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport; once is enough');
  });

  test('on a 560px-high screen no focused sidebar link hides behind the sticky foot', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.setViewportSize({ width: 1280, height: 560 });
    await page.goto('/admin/students');
    await expect(page.locator('aside [data-side-foot]')).toBeVisible();
    await expect(page.locator('aside nav a').last()).toBeAttached();
    const foot = page.locator('aside [data-side-foot]');
    const covered: string[] = [];
    for (const link of await page.locator('aside nav a').all()) {
      await link.focus(); // the browser scrolls it into view, honouring the aside's scroll padding
      const [at, under] = [await link.boundingBox(), await foot.boundingBox()];
      if (at && under && at.y + at.height > under.y + 0.5) covered.push((await link.textContent()) ?? '?');
    }
    expect(covered).toEqual([]);
  });

  test('the dashboard\'s wide table is a named region: Tab can land on it and the arrow keys scroll it', async ({ asRole }) => {
    test.setTimeout(120_000);
    await seedDashboard(await resetAbrar());
    try {
      const page = await asRole('admin');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/admin');
      const region = page.getByRole('region', { name: new RegExp(ar.dashboard.byMonth) });
      await expect(region).toBeVisible();
      await region.focus();
      await expect(region).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect.poll(() => region.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0);
    } finally {
      await removeDashboardExpense();
    }
  });

  test('removing a filter chip keeps focus: the next chip, then «تصفية» once none is left', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin/leads?source=referral&assignee=none');
    const chips = page.getByRole('list', { name: ar.table.activeFilters }).getByRole('button', { name: new RegExp(`^${ar.table.removeFilter.split('{')[0]}`) });
    await expect(chips).toHaveCount(2);
    await chips.first().focus();
    await page.keyboard.press('Enter');
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(chips).toHaveCount(0);
    await expect(page.getByRole('button', { name: new RegExp(`^${ar.table.filter}`) })).toBeFocused();
  });
});
