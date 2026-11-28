import { LOCALE_STORAGE_KEY } from '@ab/core';
import { CLOCK_STORAGE_KEY } from '@ab/time';
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { openNav } from '../../support/core/nav';

// The theme switch sits right before the bell from 900px: one row with the crumbs (which
// truncate), the bell at the inline end and fully on screen, nothing scrolling sideways. The web
// has no time-format switch: it always shows 12-hour times. Runs once (desktop project).

const WIDTHS = [900, 1024, 1180, 1340, 1440] as const;
type Dict = typeof ar;

const middle = async (el: Locator) => {
  const box = await el.boundingBox();
  if (!box) throw new Error('not rendered');
  return { y: box.y + box.height / 2, start: box.x, end: box.x + box.width };
};

const documentOverflow = (page: Page) =>
  page.evaluate<number>('document.scrollingElement.scrollWidth - window.innerWidth');

interface Span {
  start: number;
  end: number;
}

/** Whether `later` comes after `earlier` in the reading direction. */
const FOLLOWS = {
  ar: (later: Span, earlier: Span) => later.end <= earlier.start,
  en: (later: Span, earlier: Span) => later.start >= earlier.end,
};

async function checkRow(page: Page, row: Locator, opts: { lang: 'ar' | 'en'; label: string }) {
  const { lang, label } = opts;
  const dict: Dict = lang === 'ar' ? ar : en;
  const theme = row.getByRole('group', { name: dict.theme.label });
  const bell = row.getByRole('button', { name: new RegExp(`^${dict.bell.open}`) });
  await expect(bell).toBeVisible();
  await expect(page.getByRole('group', { name: dict.clock.label })).toHaveCount(0);
  const [t, b] = await Promise.all([middle(theme), middle(bell)]);
  expect.soft(Math.abs(t.y - b.y), `${label}: same row`).toBeLessThan(4);
  expect.soft(FOLLOWS[lang](b, t), `${label}: the bell after the theme`).toBe(true);
  expect.soft(b.start, `${label}: the bell is on screen`).toBeGreaterThanOrEqual(0);
  expect
    .soft(b.end, `${label}: the bell is on screen`)
    .toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  expect.soft(await documentOverflow(page), `${label}: no sideways scroll`).toBeLessThanOrEqual(0);
}

for (const lang of ['ar', 'en'] as const) {
  test(`the theme switch beside the bell at 900-1440px in ${lang}`, async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'sizes its own viewport; once is enough');
    test.setTimeout(120_000);
    const dict: Dict = lang === 'ar' ? ar : en;
    const page = await asRole('admin');
    if (lang === 'en') {
      await page.addInitScript(`localStorage.setItem(${JSON.stringify(LOCALE_STORAGE_KEY)}, 'en')`);
    }
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/admin/students');
      const crumbs = page.getByRole('navigation', { name: dict.common.breadcrumbs });
      await expect(crumbs).toBeVisible();
      const row = page.locator('[data-head-end]');
      await checkRow(page, row, { lang, label: `admin ${lang} @${width}px` });
      const [r, b] = await Promise.all([middle(crumbs), middle(row)]);
      expect
        .soft(Math.abs(r.y - b.y), `admin ${lang} @${width}px: crumbs on the row`)
        .toBeLessThan(6);
    }
  });
}

test('12-hour clocks despite a saved 24-hour choice; the theme switch works', async ({
  asRole,
}) => {
  test.skip(test.info().project.name !== 'desktop', 'the wide layout');
  const page = await asRole('admin');
  await page.addInitScript(`localStorage.setItem(${JSON.stringify(CLOCK_STORAGE_KEY)}, '24')`);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/admin/students');
  const head = page.locator('[data-running-head]');
  await expect(head.getByText(ar.runningHead.riyadh)).toHaveText(/\d{1,2}:\d{2} [صم]/);
  const row = page.locator('[data-head-end]');
  const theme = row.getByRole('group', { name: ar.theme.label });
  await theme.getByRole('button', { name: ar.theme.dark }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Tab');
  await expect(row.getByRole('button', { name: new RegExp(`^${ar.bell.open}`) })).toBeFocused();
  await theme.getByRole('button', { name: ar.theme.auto }).click();
});

test('below 900px the theme switch is in the menu sheet; no time switch', async ({ asRole }) => {
  const page = await asRole('admin');
  if (test.info().project.name === 'desktop')
    await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/students');
  const sheet = await openNav(page);
  const theme = await middle(sheet.getByRole('group', { name: ar.theme.label }));
  await expect(sheet.getByRole('group', { name: ar.clock.label })).toHaveCount(0);
  const nav = await middle(sheet.getByRole('navigation', { name: ar.nav.label }));
  expect(theme.y).toBeLessThan(nav.y);
  await expect(sheet.getByRole('button', { name: ar.auth.logout })).toBeVisible();
});
