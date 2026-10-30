import { LOCALE_STORAGE_KEY } from '@ab/shared';
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { removeDashboardExpense, seedDashboard } from '../../support/finance/money-dashboard';
import { resetAbrar } from '../../support/schedule';

// Owner, 2026-10-05: "fix the overflow in the dashboard". The admin frame is viewport-high and its
// work page scrolls inside `[data-page-scroll]` (PageFrame), so sideways overflow shows up THERE,
// not on the document (responsive.spec.ts measures the document). Wide tables must scroll in their
// own box; nothing may widen the page. Runs once (desktop project), sizing its own viewport.

const WIDTHS = [360, 390, 768, 1024, 1440] as const;

/** How far the work page's scroll box is wider than its frame (0 = no sideways scroll). */
const frameOverflow = (page: Page) =>
  page.evaluate<number>(
    "(() => { const el = document.querySelector('[data-page-scroll]'); return el ? el.scrollWidth - el.clientWidth : 99999; })()",
  );
const documentOverflow = (page: Page) => page.evaluate<number>('document.scrollingElement.scrollWidth - window.innerWidth');

test.describe('the dashboard never scrolls sideways', () => {
  test.afterEach(removeDashboardExpense);

  for (const lang of ['ar', 'en'] as const) {
    test(`/admin at 360, 390, 768, 1024 and 1440px in ${lang === 'ar' ? 'Arabic (RTL)' : 'English (LTR)'}`, async ({ asRole }) => {
      test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport; once is enough');
      test.setTimeout(180_000);
      const dict = lang === 'ar' ? ar : en;
      const teacherId = await resetAbrar();
      await seedDashboard(teacherId); // leads, a paid and an unpaid package, lessons, an expense: every table has rows
      const page = await asRole('admin');
      if (lang === 'en') await page.addInitScript(`localStorage.setItem(${JSON.stringify(LOCALE_STORAGE_KEY)}, 'en')`);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/admin');
        // The widest tables arrive last: wait for the period block before measuring.
        await expect(page.getByRole('table', { name: dict.dashboard.funnel })).toBeVisible();
        await expect(page.getByRole('table', { name: dict.dashboard.byMonth })).toBeVisible();
        await expect(page.getByRole('table', { name: dict.dashboard.bySource })).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect.soft(await frameOverflow(page), `/admin ${lang} @${width}px: the page frame`).toBeLessThanOrEqual(0);
        expect.soft(await documentOverflow(page), `/admin ${lang} @${width}px: the document`).toBeLessThanOrEqual(0);
      }
    });
  }
});
