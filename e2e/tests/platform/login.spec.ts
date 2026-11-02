import { ar, expect, loginViaUi, test } from '../../support/core/fixtures';
import { openNav } from '../../support/core/nav';
import { USERS } from '../../support/core/users';

test.describe('login smoke (R-AUTH-01, R-NFR-01)', () => {
  test('page is Arabic and RTL', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { name: ar.auth.loginTitle })).toBeVisible();
  });

  test('admin logs in and lands on the dashboard', async ({ page }) => {
    await loginViaUi(page, 'admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: ar.admin.dashboardTitle })).toBeVisible();
  });

  test('teacher lands on own home', async ({ page }) => {
    await loginViaUi(page, 'teacher');
    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole('heading', { level: 1, name: ar.teacher.dashboardTitle })).toBeVisible();
  });

  test('wrong password shows the Arabic error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(ar.auth.email).fill(USERS.admin.email);
    await page.getByLabel(ar.auth.password).fill('wrong-password');
    await page.getByRole('button', { name: ar.auth.submit }).click();
    await expect(page.getByRole('alert')).toHaveText(ar.auth.invalidCredentials);
  });

  test('protected routes redirect to login when signed out', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('saved session opens admin directly; teacher is bounced', async ({ asRole }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin');
    await expect(admin.getByRole('heading', { level: 1, name: ar.admin.dashboardTitle })).toBeVisible();
    const teacher = await asRole('teacher');
    await teacher.goto('/admin');
    await expect(teacher).toHaveURL(/\/login$/);
  });

  // Fresh UI login: signOut revokes the session, so never use the shared storageState here.
  test('logout returns to login', async ({ page }) => {
    await loginViaUi(page, 'admin');
    await expect(page).toHaveURL(/\/admin$/);
    await (await openNav(page)).getByRole('button', { name: ar.auth.logout }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
