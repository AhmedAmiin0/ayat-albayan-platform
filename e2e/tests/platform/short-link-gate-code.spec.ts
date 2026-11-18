import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { stubReset } from '../../support/core/wa-stub';
import { closeCodes, codeSentTo, openCodes } from '../../support/people/family-sign-in';
import { freshGatePhone, seedGateLink } from '../../support/platform/short-link-gate';

// The gate /l/<code> for a visitor with no account (docs/19 «Gate flow»): the title hidden, a
// WhatsApp number, the code «Meta» (tools/wa-stub) got, then the target. Never real WhatsApp.

const G = ar.shortLinks.gate;
const box = (page: Page, n: number) =>
  page.getByLabel(ar.familyAuth.codeDigit.replace('{n}', String(n)));

/** A signed-out visitor sends a code to `phone` from the gate of a fresh link. */
async function toCodeStep(page: Page, target: string, phone: string): Promise<void> {
  const code = await seedGateLink({ target, title: 'لقاء خاص' });
  await page.goto(`/l/${code}`);
  await expect(page.getByRole('heading', { name: G.fromAcademy })).toBeVisible();
  await expect(page.getByText('لقاء خاص')).toHaveCount(0);
  await page.getByLabel(ar.familyAuth.phone).fill(phone);
  await page.getByRole('button', { name: G.sendCode }).click();
  await expect(page.getByText(G.codeTitle)).toBeVisible();
}

test.describe('the short-link gate by WhatsApp code', () => {
  test.beforeEach(async () => {
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('a wrong code: «الرمز غير صحيح…»', async ({ browser }, info) => {
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    const phone = freshGatePhone();
    await toCodeStep(page, `${info.project.use.baseURL ?? ''}/login?from=gate`, phone);
    const sent = await codeSentTo(phone);
    const wrong = sent === '000000' ? '111111' : '000000';
    await box(page, 1).fill(wrong);
    await page.getByRole('button', { name: G.verify }).click();
    await expect(page.getByText(G.errors.invalid_code)).toBeVisible();
  });

  test('the code from WhatsApp opens the link', async ({ browser }, info) => {
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    const phone = freshGatePhone();
    await toCodeStep(page, `${info.project.use.baseURL ?? ''}/login?from=gate`, phone);
    await box(page, 1).fill(await codeSentTo(phone));
    await page.getByRole('button', { name: G.verify }).click();
    await expect(page).toHaveURL(/\/login\?from=gate$/);
  });
});
