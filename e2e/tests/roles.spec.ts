import { seedUser } from '../support/db';
import { ar, expect, test } from '../support/fixtures';
import { apiStatus } from '../support/messages';
import { openNav } from '../support/nav';
import { withSql } from '../support/schedule';

// «الأدوار والصلاحيات» (owner, 2026-10-05): the admin creates «محاسب» with payments.read only and
// gives it to a staff user. That user lands in the admin app on «المدفوعات», sees no «الطلاب» in
// the nav, and the API refuses the students list (403) — the role's grants, not its base role.

const P = ar.permissions.page;
const RUN = Date.now() % 100_000;
const ROLE_NAME = `محاسب ${RUN}`;
const STAFF = { email: `accountant-${RUN}@e2e.local`, password: 'Accountant-e2e-123', fullName: `محاسب الاختبار ${RUN}` };

test.describe('roles and permissions («الأدوار والصلاحيات»)', () => {
  let staffId = '';

  test.beforeAll(async () => {
    staffId = await seedUser({ ...STAFF, role: 'assistant' });
  });

  test.afterAll(async () => {
    await withSql(async (sql) => {
      await sql`delete from auth.users where id = ${staffId}`;
      await sql`delete from public.roles where name_ar = ${ROLE_NAME}`;
    });
  });

  test('a «محاسب» sees المدفوعات only and gets 403 on students', async ({ asRole, browser }) => {
    const admin = await asRole('admin');
    await admin.goto('/admin/roles');
    await expect(admin.getByRole('heading', { level: 1, name: P.title })).toBeVisible();

    await admin.getByRole('button', { name: P.newRole }).click();
    const dialog = admin.getByRole('dialog', { name: P.newRole });
    await dialog.getByLabel(P.nameAr).fill(ROLE_NAME);
    await dialog.getByLabel(P.baseRole).selectOption('admin');
    await dialog.getByRole('checkbox', { name: ar.permissions.items['payments.read'], exact: true }).check();
    await dialog.getByRole('button', { name: P.save }).click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByRole('button', { name: `${P.edit} ${ROLE_NAME}` })).toBeVisible();

    const select = admin.getByRole('combobox', { name: `${P.role}: ${STAFF.fullName}` });
    await select.selectOption({ label: ROLE_NAME });
    await expect.poll(async () => {
      const rows = await withSql((sql) => sql<{ role: string }[]>`select role::text from public.profiles where id = ${staffId}`);
      return rows[0]?.role;
    }).toBe('admin');

    const ctx = await browser.newContext({ locale: 'ar' });
    const page = await ctx.newPage();
    await page.goto('/login');
    await page.getByLabel(ar.auth.email).fill(STAFF.email);
    await page.getByLabel(ar.auth.password).fill(STAFF.password);
    await page.getByRole('button', { name: ar.auth.submit }).click();

    // No dashboard.read: the admin home sends the user to their first page.
    await expect(page).toHaveURL(/\/admin\/payments/);
    // The nav: the sidebar, or the «القائمة» sheet below 900px (the same filtered list).
    const nav = (await openNav(page)).getByRole('navigation', { name: ar.nav.label });
    await expect(nav.getByRole('link', { name: ar.payments.title })).toBeVisible();
    await expect(nav.getByRole('link', { name: ar.nav.students })).toHaveCount(0);
    expect(await apiStatus(page, '/students')).toBe(403);
    expect(await apiStatus(page, '/payments')).toBe(200);
    await ctx.close();
  });
});
