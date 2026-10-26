import { ar, expect, test } from '../support/fixtures';
import { closeCodes, codeSentTo, family, openCodes } from '../support/family-sign-in';
import { stubReset } from '../support/wa-stub';

// /login «الأسرة والطلاب» (docs/30 §7) in a real browser: phone → the WhatsApp code from the stub →
// the six boxes → the guardian lands on their home (/portal, the placeholder another task builds).

test.describe('family tab on /login', () => {
  test.beforeEach(async () => {
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('a guardian signs in with the phone on file and a WhatsApp code', async ({ browser }) => {
    const f = await family();
    const page = await (await browser.newContext({ locale: 'ar' })).newPage();
    await page.goto('/login');
    await page.getByRole('tab', { name: ar.familyAuth.tabs.family }).click();
    await page.getByLabel(ar.familyAuth.phone).fill(f.phone);
    await page.getByRole('button', { name: ar.familyAuth.sendCode }).click();
    await expect(page.getByText(ar.familyAuth.codeSent)).toBeVisible();
    const code = await codeSentTo(f.phone);
    await page.getByLabel(ar.familyAuth.codeDigit.replace('{n}', '1')).fill(code);
    await page.getByRole('button', { name: ar.familyAuth.verify }).click();
    await expect(page).toHaveURL(/\/portal/);
    await page.context().close();
  });

  test('while codes are off, the family tab says «not yet» and sends nothing', async ({ browser }) => {
    await closeCodes();
    const page = await (await browser.newContext({ locale: 'ar' })).newPage();
    await page.goto('/login');
    await page.getByRole('tab', { name: ar.familyAuth.tabs.family }).click();
    await expect(page.getByText(ar.familyAuth.familyUnavailable)).toBeVisible();
    await expect(page.getByLabel(ar.familyAuth.phone)).toHaveCount(0);
    await page.context().close();
  });
});
