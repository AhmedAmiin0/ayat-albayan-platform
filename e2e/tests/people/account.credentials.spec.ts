import { accountUser, currentPassword, openAccount, region, save } from '../../support/account';
import { seedUser } from '../../support/core/db';
import { ar, expect, test } from '../../support/core/fixtures';
import { dropLogins, expectRefused, expectSignedIn, profileOf, signInAs } from '../../support/people/users-control';

// «حسابي» (R-ACC-03/04): a dedicated assistant changes their email, then their password (both
// with the current password); the next sign-in works with the new email + new password only.
// Label/region assumptions: see e2e/support/account.ts.

const USER = accountUser('account-cred');
const NEW_EMAIL = `account-cred-new-${USER.run}@e2e.local`;
const NEW_PASSWORD = `New-pass-e2e-${USER.run}`;
const A = ar.account;

test.describe('account: email and password', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedUser({ ...USER, role: 'assistant' });
  });

  test.afterAll(async () => {
    await dropLogins([USER.email, NEW_EMAIL]);
  });

  test('R-ACC-03/04: new email, new password, then sign in with both', async ({ browser }) => {
    const page = await signInAs(browser, USER);
    await expectSignedIn(page);
    await openAccount(page);

    const email = region(page, 'email');
    await email.getByLabel(A.email.label, { exact: true }).fill(NEW_EMAIL);
    await currentPassword(email).fill(USER.password);
    await save(email);
    await expect(page.getByText(A.toast.email)).toBeVisible();
    await expect.poll(async () => (await profileOf(NEW_EMAIL)).length).toBe(1);

    const password = region(page, 'password');
    await currentPassword(password).fill(USER.password);
    await password.getByLabel(A.password.new, { exact: true }).fill(NEW_PASSWORD);
    await password.getByLabel(A.password.confirm, { exact: true }).fill(NEW_PASSWORD);
    await save(password);
    await expect(page.getByText(A.toast.password)).toBeVisible();
    // The session is kept on this device (contract: PUT /me/password → 204, session kept).
    await page.reload();
    await expect(page).toHaveURL(/\/account/);
    await page.context().close();

    await expectSignedIn(await signInAs(browser, { email: NEW_EMAIL, password: NEW_PASSWORD }));
    await expectRefused(await signInAs(browser, { email: NEW_EMAIL, password: USER.password }));
    await expectRefused(await signInAs(browser, { email: USER.email, password: NEW_PASSWORD }));
  });

  test('R-ACC-04: a wrong current password is refused and the password stays', async ({ browser }) => {
    const page = await signInAs(browser, { email: NEW_EMAIL, password: NEW_PASSWORD });
    await expectSignedIn(page);
    await openAccount(page);

    const password = region(page, 'password');
    await currentPassword(password).fill(`${NEW_PASSWORD}-wrong`);
    await password.getByLabel(A.password.new, { exact: true }).fill(`${NEW_PASSWORD}-2`);
    await password.getByLabel(A.password.confirm, { exact: true }).fill(`${NEW_PASSWORD}-2`);
    await save(password);
    await expect(page.getByText(A.errors.wrong_password)).toBeVisible();
    await page.context().close();

    await expectSignedIn(await signInAs(browser, { email: NEW_EMAIL, password: NEW_PASSWORD }));
  });
});
