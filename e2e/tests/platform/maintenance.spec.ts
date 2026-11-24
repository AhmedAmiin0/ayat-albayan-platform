import { ar, expect, test } from '../../support/core/fixtures';
import { PUBLIC_SETTINGS, stubSwitch, switchAnswer } from '../../support/platform/maintenance';

// Maintenance is a client cover only; the switch is stubbed per page, never flipped for real.
const M = ar.maintenance;

test.describe('maintenance cover (staff web)', () => {
  test('a teacher is covered while the switch is on; the page under it is inert', async ({ asRole }) => {
    const page = await asRole('teacher');
    await stubSwitch(page, { value: true });
    await page.goto('/teacher');
    await expect(page.getByRole('heading', { level: 2, name: M.planned.title })).toBeVisible();
    await expect(page.getByText(M.planned.body)).toBeVisible();
    await expect(page.locator('div[inert] h1')).toBeAttached();
  });

  test('an admin still gets in', async ({ asRole }) => {
    const page = await asRole('admin');
    await stubSwitch(page, { value: true });
    const answered = switchAnswer(page);
    await page.goto('/admin');
    await answered;
    await expect(page.getByRole('heading', { level: 1, name: ar.admin.dashboardTitle })).toBeVisible();
    await expect(page.getByText(M.planned.title)).toHaveCount(0);
    await expect(page.locator('div[inert]')).toHaveCount(0);
  });

  test('switched off, «أعد المحاولة» lifts the cover', async ({ asRole }) => {
    const page = await asRole('teacher');
    const on = { value: true };
    await stubSwitch(page, on);
    await page.goto('/teacher');
    await expect(page.getByText(M.planned.title)).toBeVisible();
    on.value = false;
    await page.getByRole('button', { name: M.retry }).click();
    await expect(page.getByText(M.planned.title)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: ar.teacher.dashboardTitle })).toBeVisible();
  });

  test('an API that stops answering while Supabase does shows the outage screen', async ({ asRole }) => {
    const page = await asRole('teacher');
    await page.route(PUBLIC_SETTINGS, (route) => route.abort());
    await page.goto('/teacher');
    await expect(page.getByRole('heading', { level: 2, name: M.outage.title })).toBeVisible();
  });

  test('an offline device draws no cover', async ({ asRole }) => {
    const page = await asRole('teacher');
    await page.goto('/teacher');
    await expect(page.getByRole('heading', { level: 1, name: ar.teacher.dashboardTitle })).toBeVisible();
    await page.context().setOffline(true);
    await page.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await page.waitForTimeout(3_000); // longer than the 2 s confirm pause
    await expect(page.getByText(M.outage.title)).toHaveCount(0);
    await expect(page.locator('div[inert]')).toHaveCount(0);
    await page.context().setOffline(false);
  });

  test('signed out at /login with the switch on: the login form, so an admin can get in', async ({ page }) => {
    await stubSwitch(page, { value: true });
    const answered = switchAnswer(page);
    await page.goto('/login');
    await answered;
    await expect(page.getByRole('heading', { name: ar.auth.loginTitle })).toBeVisible();
    await expect(page.getByText(M.planned.title)).toHaveCount(0);
  });
});
