import { ar, expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { AR_LOCALE } from '../../support/core/locale';
import { stubReset } from '../../support/core/wa-stub';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { guardianSignIn, seedPortalFamily, studentSignIn } from '../../support/people/family-portal';

// Family web profile and package pages; a child's login never requests the package.

const P = ar.portal;
const PACKAGE_READ = /\/portal\/students\/[^/]+\/package(\?|$)/;

test.describe('family profile and package pages', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so no sign-in codes');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one browser: sign-in codes are rate limited');
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('a guardian: «حسابي» → the profile → a child; a card → the package', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await guardianSignIn(page, family.phone);

    const card = page.getByRole('article', { name: family.first.name });
    await card.getByRole('link', { name: new RegExp(P.packageTab) }).click();
    await expect(page).toHaveURL(new RegExp(`/package/${family.first.id}$`));
    const title = `${P.packageTab} · ${family.first.name}`;
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('region', { name: P.payments })).toBeVisible();
    await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0);

    await page.goto(`${FAMILY_URL}/account`);
    await page.getByRole('link', { name: new RegExp(P.app.profile.open) }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { level: 1, name: P.app.profile.title })).toBeVisible();
    await expect(page.getByRole('heading', { name: P.app.profile.details })).toBeVisible();
    await expect(page.getByText(P.app.profile.note)).toBeVisible();
    await expect(page.getByText(/@family\.invalid/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: new RegExp(family.second.name) })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(family.first.name) }).click();
    await expect(page).toHaveURL(new RegExp(`/children/${family.first.id}`));
    await expect(page.getByRole('heading', { level: 1, name: family.first.name })).toBeVisible();
    await page.context().close();
  });

  test('a child’s own login: their code on the profile, never the package', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    const asked: string[] = [];
    page.on('request', (request) => asked.push(request.url()));
    await studentSignIn(page, family);

    await page.goto(`${FAMILY_URL}/profile`);
    await expect(page.getByRole('heading', { level: 1, name: P.app.profile.title })).toBeVisible();
    await expect(page.getByText(family.first.code).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: P.app.account.children })).toHaveCount(0);

    await page.goto(`${FAMILY_URL}/package/${family.first.id}`);
    await expect(page.getByRole('heading', { level: 1, name: family.first.name })).toBeVisible();
    await expect(page.getByText(P.packageEmpty)).toBeVisible();
    await expect(page.getByText(P.amountDue)).toHaveCount(0);
    // API reads only: the dev server also serves modules from packages/….
    expect(asked.filter((url) => PACKAGE_READ.test(url))).toEqual([]);
    await page.context().close();
  });
});
