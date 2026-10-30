import { seedUser } from '../../support/core/db';
import { ar, expect, test } from '../../support/fixtures';
import { dropLogins, detailDialog, expectRefused, expectSignedIn, openUser, signInAs, stamp, takeIssued } from '../../support/people/users-control';

// «المستخدمون»: disabling a login refuses its sign-in, enabling brings it back, and a password
// reset makes the old password useless and the new one work.

const RUN = stamp();
const USER = { email: `login-${RUN}@e2e.local`, password: `Old-pass-e2e-${RUN}`, fullName: `مستخدم الدخول ${RUN}` };
const A = ar.users.actions;

test.describe('users control: sign-in', () => {
  test.beforeAll(async () => {
    await seedUser({ ...USER, role: 'assistant' });
  });

  test.afterAll(async () => {
    await dropLogins([USER.email]);
  });

  test('disable refuses the login, enable restores it', async ({ asRole, browser }) => {
    const page = await asRole('admin');
    await expectSignedIn(await signInAs(browser, USER));

    const dialog = await openUser(page, USER.fullName);
    await dialog.getByRole('button', { name: A.disable, exact: true }).click();
    const confirm = page.getByRole('dialog', { name: ar.users.disable.title });
    await confirm.getByLabel(ar.users.disable.reason).fill('اختبار');
    await confirm.getByRole('button', { name: ar.users.disable.confirm, exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(ar.users.toast.disabled)).toBeVisible();
    await expect(page.getByText(ar.users.status.disabled)).toBeVisible();
    await expectRefused(await signInAs(browser, USER));

    const again = await openUser(page, USER.fullName);
    await again.getByRole('button', { name: A.enable, exact: true }).click();
    await expect(page.getByText(ar.users.toast.enabled)).toBeVisible();
    await expectSignedIn(await signInAs(browser, USER));
  });

  test('a reset password replaces the old one', async ({ asRole, browser }) => {
    const page = await asRole('admin');
    const dialog = await openUser(page, USER.fullName);
    await dialog.getByRole('button', { name: A.resetPassword }).click();
    await page.getByRole('dialog', { name: ar.users.reset.title }).getByRole('button', { name: ar.users.reset.confirm }).click();
    const fresh = await takeIssued(page, ar.users.result.resetTitle);
    expect(fresh).not.toBe(USER.password);
    await expect(detailDialog(page)).toBeHidden();
    await expectRefused(await signInAs(browser, USER));
    await expectSignedIn(await signInAs(browser, { email: USER.email, password: fresh }));
  });
});
