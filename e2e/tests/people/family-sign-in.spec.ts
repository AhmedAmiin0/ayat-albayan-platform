import { ar, expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { closeCodes, codeSentTo, family, openCodes } from '../../support/people/family-sign-in';
import { stubReset } from '../../support/core/wa-stub';
import { AR_LOCALE } from '../../support/core/locale';

// The family host's /login (docs/51): one sign-in for guardians and students,
// WhatsApp first: the number → the code from the stub → the six boxes → the guardian's /portal.

const S = ar.familyApp.signIn;

test.describe('family sign-in on the family host', () => {
  test.beforeEach(async () => {
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('a guardian signs in with the phone on file and a WhatsApp code', async ({ browser }) => {
    const f = await family();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await page.goto(`${FAMILY_URL}/login`);
    await expect(page.getByRole('tab')).toHaveCount(0);
    await page.getByLabel(ar.familyAuth.phone).fill(f.phone);
    await page.getByRole('button', { name: ar.familyAuth.sendCode }).click();
    await expect(page.getByRole('heading', { name: ar.familyApp.signIn.codeTitle })).toBeVisible();
    const code = await codeSentTo(f.phone);
    // The sixth digit signs in on its own (no verify tap).
    await page.getByLabel(ar.familyAuth.codeDigit.replace('{n}', '1')).fill(code);
    await expect(page).toHaveURL(/\/portal/);
    await page.context().close();
  });

  test('while codes are off, the student code form shows and no WhatsApp', async ({ browser }) => {
    await closeCodes();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await page.goto(`${FAMILY_URL}/login`);
    await expect(page.getByText(S.whatsappOff)).toBeVisible();
    await expect(page.getByLabel(S.studentCode)).toBeVisible();
    await expect(page.getByLabel(ar.familyAuth.phone)).toHaveCount(0);
    await page.context().close();
  });
});
