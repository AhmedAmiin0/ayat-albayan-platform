import type { Page } from '@playwright/test';
import { accountRow, accountUser, AVATAR_PNG, avatarAlt, currentPassword, openAccount, phoneOf, region, save } from '../support/account';
import { seedUser } from '../support/db';
import { ar, expect, test } from '../support/fixtures';
import { dropLogins, expectSignedIn, signInAs } from '../support/users-control';

// «حسابي» (R-ACC-01/02/05): a dedicated assistant opens /account, renames themself, changes the
// phone with the current password (a wrong one is refused with errors.wrong_password), and uploads
// a photo that is stored in the private avatars bucket and shown back. Label/region assumptions:
// see e2e/support/account.ts.

const USER = accountUser('account');
const A = ar.account;

async function signedIn(browser: Parameters<typeof signInAs>[0]): Promise<Page> {
  const page = await signInAs(browser, USER);
  await expectSignedIn(page);
  await openAccount(page);
  return page;
}

test.describe('account: profile, phone and photo', () => {
  test.beforeAll(async () => {
    await seedUser({ ...USER, role: 'assistant' });
  });

  test.afterAll(async () => {
    await dropLogins([USER.email]);
  });

  test('R-ACC-01/02: the name is shown and can be changed', async ({ browser }) => {
    const page = await signedIn(browser);
    const section = region(page, 'name');
    const field = section.getByLabel(A.name.label, { exact: true });
    await expect(field).toHaveValue(USER.fullName);

    const renamed = `${USER.fullName} المعدل`;
    await field.fill(renamed);
    await save(section);
    await expect(page.getByText(A.toast.name)).toBeVisible();
    await expect.poll(async () => (await accountRow(USER.email))?.full_name).toBe(renamed);

    await page.reload();
    await expect(region(page, 'name').getByLabel(A.name.label, { exact: true })).toHaveValue(renamed);
    await page.context().close();
  });

  test('R-ACC-02: a wrong current password keeps the old phone', async ({ browser }) => {
    const page = await signedIn(browser);
    const section = region(page, 'phone');
    await section.getByLabel(A.phone.label, { exact: true }).fill(phoneOf(USER.run));
    await currentPassword(section).fill(`${USER.password}-wrong`);
    await save(section);
    await expect(page.getByText(A.errors.wrong_password)).toBeVisible();
    expect((await accountRow(USER.email))?.phone_e164).toBeNull();
    await page.context().close();
  });

  test('R-ACC-02: the phone changes with the current password', async ({ browser }) => {
    const page = await signedIn(browser);
    const section = region(page, 'phone');
    const phone = phoneOf(USER.run);
    await section.getByLabel(A.phone.label, { exact: true }).fill(phone);
    await currentPassword(section).fill(USER.password);
    await save(section);
    await expect(page.getByText(A.toast.phone)).toBeVisible();
    await expect.poll(async () => (await accountRow(USER.email))?.phone_e164).toBe(phone);
    await page.context().close();
  });

  test('R-ACC-05: an uploaded photo is stored privately and shown', async ({ browser }) => {
    const page = await signedIn(browser);
    const section = region(page, 'avatar');
    await section.getByLabel(A.avatar.choose, { exact: true }).setInputFiles(AVATAR_PNG);
    await section.getByRole('button', { name: A.avatar.upload, exact: true }).click();
    await expect(page.getByText(A.toast.avatar)).toBeVisible();

    const name = (await accountRow(USER.email))?.full_name ?? USER.fullName;
    await expect(section.getByRole('img', { name: avatarAlt(name), exact: true })).toBeVisible();
    await expect.poll(async () => {
      const row = await accountRow(USER.email);
      return { mine: row?.avatar_path?.startsWith(`${row.id}/`), stored: row?.stored };
    }).toEqual({ mine: true, stored: 1 });

    await page.reload();
    await expect(region(page, 'avatar').getByRole('img', { name: avatarAlt(name), exact: true })).toBeVisible();
    await page.context().close();
  });
});
