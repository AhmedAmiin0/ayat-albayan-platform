import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { guardianSignIn, seedPortalFamily, studentSignIn } from '../../support/people/family-portal';

// The family portal (docs/50 §8 step 4) on the real API and seeded data: a guardian sees every
// child, the attended and missed lessons and the package with its payments; a child's own login
// never sees money (not even a /package request); the teacher chat is hidden while
// family_chat_enabled is off (its default). No WhatsApp link on any family page.

const P = ar.portal;
const MONEY = new RegExp([P.amountDue, P.payments, P.paymentInstructions, P.usedOfHint].join('|'));

const PACKAGE_READ = /\/portal\/students\/[^/]+\/package(\?|$)/;
const CHANNEL_READ = /\/portal\/students\/[^/]+\/channel\//;

test.describe('family portal /portal', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so no sign-in codes');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one browser: sign-in codes are rate limited');
    await stubReset();
    await openCodes();
    // The setting's default (off): drop any value an earlier run left.
    await withSql((sql) => sql`delete from public.settings where key = 'family_chat_enabled'`);
  });
  test.afterEach(closeCodes);

  test('a guardian sees every child, the attended and missed lessons and the package', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await guardianSignIn(page, family.phone);

    const first = page.getByRole('article', { name: family.first.name });
    await expect(first).toBeVisible();
    await expect(page.getByRole('article', { name: family.second.name })).toBeVisible();
    await expect(first.getByText(family.first.code)).toBeVisible();
    await expect(first.getByRole('region', { name: P.packageTab })).toContainText(/\d+ من \d+/);

    await first.getByRole('button', { name: P.openChild }).click();
    await expect(page.getByRole('heading', { name: family.first.name })).toBeVisible();
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveText([P.upcomingTab, P.attendedTab, P.absentTab, P.packageTab]);
    await expect(page.getByRole('tab', { name: ar.studentChannel.portalTab })).toHaveCount(0);

    await page.getByRole('tab', { name: P.attendedTab }).click();
    await page.getByRole('button', { name: P.openReport }).first().click();
    await expect(page.getByRole('heading', { name: P.reportTitle })).toBeVisible();
    await page.getByRole('button', { name: P.backToLessons }).click();

    await page.getByRole('tab', { name: P.absentTab }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('listitem')).not.toHaveCount(0);
    await expect(panel.getByText(P.absentEmpty)).toHaveCount(0);

    await page.getByRole('tab', { name: P.packageTab }).click();
    await expect(page.getByRole('region', { name: P.payments })).toBeVisible();
    await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0);

    await page.getByRole('button', { name: P.allChildren }).click();
    await expect(page.getByRole('article', { name: family.second.name })).toBeVisible();
    await page.context().close();
  });

  test('a child’s own login lands on their screen and never sees money', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    const asked: string[] = [];
    page.on('request', (request) => asked.push(request.url()));
    await studentSignIn(page, family);

    await expect(page.getByRole('heading', { name: family.first.name })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveText([P.upcomingTab, P.attendedTab, P.absentTab]);
    await expect(page.getByRole('button', { name: P.allChildren })).toHaveCount(0);
    await page.getByRole('tab', { name: P.attendedTab }).click();
    await expect(page.getByRole('button', { name: P.openReport }).first()).toBeVisible();
    await page.getByRole('tab', { name: P.absentTab }).click();
    await expect(page.getByRole('tabpanel').getByRole('listitem')).not.toHaveCount(0);

    await expect(page.locator('body')).not.toContainText(MONEY);
    // API reads only: the dev server also serves modules from packages/….
    expect(asked.filter((url) => PACKAGE_READ.test(url))).toEqual([]);
    expect(asked.filter((url) => CHANNEL_READ.test(url))).toEqual([]);
    await page.context().close();
  });
});
