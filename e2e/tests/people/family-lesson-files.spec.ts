import { ar, expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { AR_LOCALE } from '../../support/core/locale';
import { stubReset } from '../../support/core/wa-stub';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { seedPortalFamily, studentSignIn } from '../../support/people/family-portal';

// A lesson with a sent report opens its files page even with nothing recorded.

const F = ar.lessonFiles;
const P = ar.portal;

test.describe('lesson files and recordings on the family host', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so no sign-in codes');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one browser: sign-in codes are rate limited');
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('an attended lesson’s files open on its own page; the recordings page explains none', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await studentSignIn(page, family);

    await page.getByRole('tab', { name: P.app.child.attendedSelf }).click();
    await page.getByRole('button', { name: F.title, exact: true }).first().click();
    await expect(page).toHaveURL(/\/lesson\/[^/?]+\?studentId=/);
    await expect(page.getByRole('heading', { level: 1, name: /^حلقة / })).toBeVisible();
    await expect(page.getByText(F.header.replace('{n}', '1'))).toBeVisible();
    await expect(page.getByText(F.reportPdf)).toBeVisible();
    await expect(page.getByRole('button', { name: P.openPdf, exact: true })).toBeVisible();
    await expect(page.locator('audio, video')).toHaveCount(0);
    await page.getByRole('button', { name: ar.common.back, exact: true }).click();
    await expect(page).toHaveURL(/\/portal/);

    await page.goto(`${FAMILY_URL}/recordings/${family.first.id}`);
    await expect(page.getByRole('heading', { level: 1, name: F.recordings, exact: true })).toBeVisible();
    await expect(page.getByText(F.empty)).toBeVisible();
    await page.context().close();
  });
});
