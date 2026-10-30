import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { openNav } from '../../support/core/nav';

// Owner, 2026-10-05: "enhance the responsive view and make it simpler". Below 900px every area has
// ONE compact bar (mark, page title, «القائمة»); the nav, theme, language and logout open in a
// sheet. No scrolling nav row and no breadcrumbs on phones. From 900px the sidebar / header row.

const menu = (page: Page) => page.getByRole('button', { name: ar.nav.menu, exact: true });

test.describe('the compact shell bar', () => {
  test('admin on a phone: one bar, the nav in the «القائمة» sheet, a pick closes it', async ({ asRole }) => {
    const page = await asRole('admin');
    if (test.info().project.name === 'desktop') await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/students');
    await expect(page.getByRole('heading', { level: 1, name: ar.nav.students })).toBeVisible();
    await expect(menu(page)).toBeVisible();
    await expect(page.getByRole('navigation', { name: ar.nav.label })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: ar.common.breadcrumbs })).toBeHidden();
    const sheet = await openNav(page);
    await expect(sheet.getByRole('list', { name: ar.finance.nav, exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: ar.auth.logout })).toBeVisible();
    await sheet.getByRole('link', { name: ar.nav.teachers, exact: false }).first().click();
    await expect(page).toHaveURL(/\/admin\/teachers$/);
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: ar.teachers.title })).toBeVisible();
  });

  test('teacher on a phone: no bottom tab bar; the pages are in the sheet', async ({ asRole }) => {
    const page = await asRole('teacher');
    if (test.info().project.name === 'desktop') await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/teacher');
    await expect(page.getByRole('navigation', { name: ar.teacherNav.label })).toHaveCount(0);
    const sheet = await openNav(page);
    await sheet.getByRole('link', { name: ar.teacherNav.students, exact: true }).click();
    await expect(page).toHaveURL(/\/teacher\/students$/);
    await expect(sheet).toBeHidden();
  });

  test('from 900px: the sidebar nav, no «القائمة»', async ({ asRole }) => {
    test.skip(test.info().project.name !== 'desktop', 'the wide layout');
    const page = await asRole('admin');
    await page.goto('/admin/students');
    await expect(page.getByRole('navigation', { name: ar.nav.label })).toBeVisible();
    await expect(menu(page)).toBeHidden();
    await expect(page.getByRole('navigation', { name: ar.common.breadcrumbs })).toBeVisible();
  });
});
