import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { setSetting } from '../../support/core/messages';
import { stubReset } from '../../support/core/wa-stub';
import { closeCodes, codeSentTo, openCodes } from '../../support/people/family-sign-in';
import { codeTeacher } from '../../support/people/teacher-sign-in';

// docs/46 A9: a teacher with no login → «الدخول برمز واتساب» → the code from the stub →
// /account-setup (email + password) → her home; then a fresh browser signs in with her phone + that
// password. Staff codes do not need the family flag (A1): it stays off here.

const PASSWORD = 'Teacher-e2e-pass-1';

test.describe('teacher WhatsApp-code sign-in on /login', () => {
  test.beforeEach(async () => {
    await stubReset();
    await openCodes();
    await setSetting('family_login_enabled', false);
  });
  test.afterEach(closeCodes);

  test('code → first-time setup → home, then phone + password', async ({ browser }) => {
    const teacher = await codeTeacher();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await page.goto('/login');
    await page.getByRole('button', { name: ar.teacherAuth.withCode }).click();
    await page.getByLabel(ar.familyAuth.phone).fill(teacher.phone);
    await page.getByRole('button', { name: ar.familyAuth.sendCode }).click();
    await expect(page.getByText(ar.familyAuth.codeSent)).toBeVisible();
    const code = await codeSentTo(teacher.phone);
    await page.getByLabel(ar.familyAuth.codeDigit.replace('{n}', '1')).fill(code);
    await page.getByRole('button', { name: ar.familyAuth.verify }).click();

    await expect(page).toHaveURL(/\/account-setup/);
    const email = `teacher-${teacher.id.slice(0, 8)}@example.com`;
    const S = ar.teacherAuth.setup;
    await page.getByLabel(S.email).fill(email);
    await page.getByLabel(S.password, { exact: true }).fill(PASSWORD);
    await page.getByLabel(S.confirm).fill(PASSWORD);
    await page.getByRole('button', { name: S.submit }).click();
    await expect(page).toHaveURL(/\/teacher/);
    await page.goto('/account-setup');
    await expect(page).toHaveURL(/\/teacher/);
    await page.context().close();

    const again = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await again.goto('/login');
    await again.getByLabel(ar.auth.email).fill(teacher.phone);
    await again.getByLabel(ar.auth.password, { exact: true }).fill(PASSWORD);
    await again.getByRole('button', { name: ar.auth.submit, exact: true }).click();
    await expect(again).toHaveURL(/\/teacher/);
    await again.context().close();
  });
});
