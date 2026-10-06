import { seedFamily, withSql } from '../support/schedule';
import { ar, expect, test } from '../support/fixtures';
import { openNav } from '../support/nav';
import {
  dropLogins, expectSignedIn, fillIdentity, openCreateDialog, openUser, detailDialog, profileOf, signInAs, stamp, takeIssued,
} from '../support/users-control';

// «المستخدمون» (owner, 2026-10-06): the admin creates logins from the UI: a staff user whose
// generated password is shown once and works, and a student login linked to an existing student.
// Then edits it. Dates are rendered by the page but never asserted here.

const F = ar.users.form;
const RUN = stamp();
const STAFF = { name: `موظفة الاختبار ${RUN}`, email: `staff-${RUN}@e2e.local` };
const STUDENT = { name: `طالب الحساب ${RUN}`, email: `student-${RUN}@e2e.local`, password: `Student-e2e-${RUN}` };

test.describe('users control: create and edit', () => {
  test.afterAll(async () => {
    await dropLogins([STAFF.email, STUDENT.email]);
  });

  test('the nav links «المستخدمون» for the admin', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin');
    const nav = (await openNav(page)).getByRole('navigation', { name: ar.nav.label });
    await expect(nav.getByRole('link', { name: ar.users.nav })).toBeVisible();
  });

  test('a staff user gets a generated password, shown once, that signs in', async ({ asRole, browser }) => {
    const page = await asRole('admin');
    const dialog = await openCreateDialog(page);
    await fillIdentity(dialog, STAFF);
    await dialog.getByLabel(F.role, { exact: true }).selectOption('assistant');
    await dialog.getByRole('button', { name: ar.users.create.submit }).click();
    const password = await takeIssued(page, ar.users.result.createdTitle);
    expect(password.length).toBeGreaterThanOrEqual(8);
    // Shown once: nothing of it is left on the page, and the list has the new row.
    await expect(page.getByText(password)).toHaveCount(0);
    await expect(page.getByRole('button', { name: STAFF.name, exact: true })).toBeVisible();
    expect((await profileOf(STAFF.email))[0]).toMatchObject({ role: 'assistant', full_name: STAFF.name });

    const staff = await signInAs(browser, { email: STAFF.email, password });
    await expectSignedIn(staff);
    await staff.context().close();
  });

  test('a student login is linked to an existing student, then edited', async ({ asRole }) => {
    const family = await seedFamily(`ولي ${RUN}`, [STUDENT.name]);
    const studentId = family.studentIds[0] ?? '';
    const page = await asRole('admin');
    const dialog = await openCreateDialog(page);
    await fillIdentity(dialog, STUDENT);
    await dialog.getByLabel(F.role, { exact: true }).selectOption('student');
    // A student login without a record is refused before any request.
    await dialog.getByRole('button', { name: ar.users.create.submit }).click();
    await expect(dialog.getByText(ar.users.validation.linkRequired)).toBeVisible();

    await dialog.getByPlaceholder(ar.users.link.placeholder).fill(STUDENT.name);
    await dialog.getByRole('button', { name: new RegExp(STUDENT.name) }).click();
    // The radio is visually hidden (sr-only): click its label.
    await dialog.locator('label', { hasText: ar.users.credential.set }).first().click();
    await dialog.getByLabel(ar.users.credential.password).fill(STUDENT.password);
    await dialog.getByRole('button', { name: ar.users.create.submit }).click();
    await expect(page.getByText(ar.users.result.setDone)).toBeVisible();
    await page.getByRole('button', { name: ar.users.result.close }).click();

    const [row] = await withSql((sql) => sql<{ profile_id: string | null }[]>`select profile_id from public.students where id = ${studentId}`);
    expect(row?.profile_id).toBeTruthy();
    expect((await profileOf(STUDENT.email))[0]?.role).toBe('student');

    const edit = await openUser(page, STUDENT.name);
    const renamed = `${STUDENT.name} المعدل`;
    await edit.getByLabel(F.fullName).fill(renamed);
    await edit.getByRole('button', { name: ar.users.detail.save }).click();
    await expect(detailDialog(page)).toBeHidden();
    await expect.poll(async () => (await profileOf(STUDENT.email))[0]?.full_name).toBe(renamed);
  });
});
