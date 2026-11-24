import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { stubReset } from '../../support/core/wa-stub';
import { guardianSignIn } from '../../support/people/family-portal';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { seedStoreFamily } from '../../support/store/store-family';
import { shoot, storePage, toDark } from '../../support/store/store-shots';
import type { StoreFamily } from '../../support/store/store.types';

// The Google Play phone screenshots of the family app, taken from the family web (the same
// screens) on demo data: .github/workflows/store-screenshots.yml runs it with STORE_SHOTS=1 and
// uploads e2e/store-shots/*.png. Every other e2e run skips it.

const P = ar.portal;
const S = P.app.schedule;

/** On a Friday run the demo lessons start in the next week. */
const TO_WEEK: Record<StoreFamily['week'], (page: Page) => Promise<void>> = {
  this: () => Promise.resolve(),
  next: (page) => page.getByRole('button', { name: S.next }).click(),
};

async function schedule(page: Page, family: StoreFamily): Promise<void> {
  await page.goto(`${FAMILY_URL}/schedule`);
  await expect(page.getByRole('heading', { level: 1, name: S.title })).toBeVisible();
  await TO_WEEK[family.week](page);
  await expect(page.getByRole('group', { name: S.days })).toBeVisible();
  await expect(page.getByRole('main').getByRole('listitem').first()).toBeVisible();
  await shoot(page, '02-schedule');
}

async function reportsAndAlerts(page: Page): Promise<void> {
  await page.goto(`${FAMILY_URL}/reports`);
  await expect(page.getByRole('heading', { level: 1, name: P.app.tabs.reports })).toBeVisible();
  await expect(page.getByRole('button', { name: P.openReport })).toHaveCount(2);
  await shoot(page, '07-reports');

  await page.goto(`${FAMILY_URL}/alerts`);
  await expect(page.getByRole('heading', { level: 1, name: ar.bell.title })).toBeVisible();
  // The alerts land after the seed; the page re-reads them every 30 s (notificationsQuery).
  await expect(page.getByRole('main').getByRole('listitem').first()).toBeVisible({
    timeout: 45_000,
  });
  await shoot(page, '08-alerts');
}

test.describe('store screenshots', () => {
  test.skip(process.env.STORE_SHOTS !== '1', 'store screenshots only: STORE_SHOTS=1');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one run: the phone is its own context');
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('the eight family app screens on a phone', async ({ browser }) => {
    test.setTimeout(240_000);
    const family = await seedStoreFamily();
    const page = await storePage(browser, family.frozenAt);
    await guardianSignIn(page, family.phone);

    await expect(page.getByRole('heading', { name: P.app.pick.title })).toBeVisible();
    const first = page.getByRole('article', { name: family.first.name });
    await expect(page.getByRole('article', { name: family.second.name })).toBeVisible();
    await shoot(page, '05-children');

    const open = P.app.home.open.replace('{name}', family.first.name);
    await first.getByRole('button', { name: open }).click();
    await expect(page.getByRole('heading', { name: family.first.name })).toBeVisible();
    await expect(page.getByRole('region', { name: P.nextLesson })).toBeVisible();
    await shoot(page, '01-home');

    await schedule(page, family);

    await page.goto(`${FAMILY_URL}/portal`);
    await page.getByRole('tab', { name: P.attendedTab }).click();
    await page.getByRole('button', { name: P.openReport }).first().click();
    await expect(page.getByRole('heading', { name: P.reportTitle })).toBeVisible();
    await expect(page.getByText(/سورة القلم/).first()).toBeVisible();
    await shoot(page, '03-report');

    await page.goto(`${FAMILY_URL}/package/${family.first.id}`);
    const packageTitle = { level: 1, name: new RegExp(P.packageTab) } as const;
    await expect(page.getByRole('heading', packageTitle)).toBeVisible();
    await shoot(page, '04-package');

    await reportsAndAlerts(page);

    await page.goto(`${FAMILY_URL}/portal`);
    await toDark(page);
    await expect(page.getByRole('region', { name: P.nextLesson })).toBeVisible();
    await shoot(page, '06-home-dark');
    await page.context().close();
  });
});
