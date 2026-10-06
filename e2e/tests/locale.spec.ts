import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { openNav } from '../support/nav';

// Phase 7: Arabic RTL is the default; the switch saves English, reloads, and the whole UI is
// English LTR until switched back. Expected text comes from en.json / ar.json, never literals.
// The switch's accessible name is «<label> <the other language's own name>»; the gap between
// the two (a whitespace node inside an inline-flex button) is not guaranteed, hence \s*.

type Dict = typeof ar;
const switchIn = (scope: Page | Locator, dict: Dict, target: 'ar' | 'en') =>
  scope.getByRole('button', { name: new RegExp(`${dict.language.label}\\s*${dict.language[target]}`) });
/** Signed in: the switch sits in the «القائمة» sheet below 900px (the mobile project), else in view. */
const switchTo = async (page: Page, dict: Dict, target: 'ar' | 'en') => switchIn(await openNav(page, dict), dict, target);

async function expectDocument(page: Page, lang: 'ar' | 'en'): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}

test.describe('language switch (English LTR, Arabic default)', () => {
  test('admin switches to English from the side foot, the choice sticks, and switches back', async ({
    asRole,
  }) => {
    const page = await asRole('admin');
    await page.goto('/admin');
    await expectDocument(page, 'ar');
    await expect(page.getByRole('heading', { level: 1, name: ar.admin.dashboardTitle })).toBeVisible();

    await (await switchTo(page, ar, 'en')).click();
    await expectDocument(page, 'en');
    await expect(page.getByRole('heading', { level: 1, name: en.admin.dashboardTitle })).toBeVisible();
    const nav = (await openNav(page, en)).getByRole('navigation', { name: en.nav.label });
    // Anchored: «Owed by students» (finance) also contains the word.
    await expect(nav.getByRole('link', { name: new RegExp(`^${en.nav.students}`) })).toBeVisible();
    await expect(nav.getByRole('link', { name: en.nav.expenses })).toBeVisible();

    // A form on another page, after a fresh navigation: the saved choice still applies.
    await page.goto('/admin/pricing');
    await expectDocument(page, 'en');
    await expect(page.getByRole('heading', { level: 1, name: en.pricing.title })).toBeVisible();
    await expect(page.getByRole('group', { name: en.pricing.steps.country, exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: en.pricing.steps.duration, exact: true })).toBeVisible();

    await (await switchTo(page, en, 'ar')).click();
    await expectDocument(page, 'ar');
    await expect(page.getByRole('heading', { level: 1, name: ar.pricing.title })).toBeVisible();
  });

  test('a teacher switches from the top bar (no sidebar) and back', async ({ asRole }) => {
    const page = await asRole('teacher');
    await page.goto('/teacher');
    await (await switchTo(page, ar, 'en')).click();
    await expectDocument(page, 'en');
    await expect(page.getByRole('heading', { level: 1, name: en.teacher.dashboardTitle })).toBeVisible();
    await (await switchTo(page, en, 'ar')).click();
    await expectDocument(page, 'ar');
    await expect(page.getByRole('heading', { level: 1, name: ar.teacher.dashboardTitle })).toBeVisible();
  });

  test('the login page switches to English and back', async ({ page }) => {
    await page.goto('/login');
    await expectDocument(page, 'ar');

    await switchIn(page, ar, 'en').click();
    await expectDocument(page, 'en');
    await expect(page.getByRole('heading', { name: en.auth.loginTitle })).toBeVisible();
    await expect(page.getByLabel(en.auth.email)).toBeVisible();
    await expect(page.getByLabel(en.auth.password)).toBeVisible();
    await expect(page.getByRole('button', { name: en.auth.submit })).toBeVisible();

    await switchIn(page, en, 'ar').click();
    await expectDocument(page, 'ar');
    await expect(page.getByRole('heading', { name: ar.auth.loginTitle })).toBeVisible();
  });
});
