import { ar, expect, test } from '../support/fixtures';
import { dropLogins, expectSignedIn, fillIdentity, openCreateDialog, profileOf, signInAs, stamp, takeIssued } from '../support/users-control';

// «المستخدمون»: an invite link (credential mode «link») opens /set-password with a recovery
// session, the new user types a password there and signs in with it. The link is the one the API
// returned; Auth redirects it to <WEB_ORIGIN>/set-password because that URL is in config.toml
// additional_redirect_urls (otherwise it falls back to site_url and this spec fails).

const RUN = stamp();
const INVITED = { name: `مدعوة بالرابط ${RUN}`, email: `invite-${RUN}@e2e.local`, password: `Chosen-e2e-${RUN}` };
const S = ar.users.setPassword;

test.describe('users control: invite link', () => {
  test.afterAll(async () => {
    await dropLogins([INVITED.email]);
  });

  test('the link opens /set-password, the typed password is saved and signs in', async ({ asRole, browser }) => {
    const page = await asRole('admin');
    const dialog = await openCreateDialog(page);
    await fillIdentity(dialog, INVITED);
    await dialog.getByLabel(ar.users.form.role, { exact: true }).selectOption('assistant');
    // The radio is visually hidden (sr-only): click its label.
    await dialog.locator('label', { hasText: ar.users.credential.link }).first().click();
    await dialog.getByRole('button', { name: ar.users.create.submit }).click();
    const link = await takeIssued(page, ar.users.result.createdTitle);
    expect(link).toContain('/auth/v1/verify');
    expect((await profileOf(INVITED.email))[0]).toMatchObject({ role: 'assistant', full_name: INVITED.name });

    const ctx = await browser.newContext({ locale: 'ar' });
    const invited = await ctx.newPage();
    await invited.goto(link);
    await expect(invited).toHaveURL(/\/set-password/);
    await invited.getByLabel(S.password, { exact: true }).fill(INVITED.password);
    await invited.getByLabel(S.confirm, { exact: true }).fill(INVITED.password);
    await invited.getByRole('button', { name: S.submit }).click();
    await expect(invited).not.toHaveURL(/\/set-password/);
    await ctx.close();

    await expectSignedIn(await signInAs(browser, { email: INVITED.email, password: INVITED.password }));
  });
});
