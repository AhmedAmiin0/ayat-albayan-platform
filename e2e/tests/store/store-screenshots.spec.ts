import { ar, expect, test } from '../../support/core/fixtures';
import { FAMILY_URL } from '../../support/core/family-host';
import { stubReset } from '../../support/core/wa-stub';
import { guardianSignIn } from '../../support/people/family-portal';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { seedStoreFamily } from '../../support/store/store-family';
import { shoot, storePage, toDark } from '../../support/store/store-shots';

// The Google Play phone screenshots of the family app, taken from the family web (the same
// screens) on demo data: .github/workflows/store-screenshots.yml runs it with STORE_SHOTS=1 and
// uploads e2e/store-shots/*.png. Every other e2e run skips it.

const P = ar.portal;

test.describe('store screenshots', () => {
  test.skip(process.env.STORE_SHOTS !== '1', 'store screenshots only: STORE_SHOTS=1');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one run: the phone is its own context');
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('the six family app screens on a phone', async ({ browser }) => {
    test.setTimeout(180_000);
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

    await page.goto(`${FAMILY_URL}/schedule`);
    const schedule = P.app.schedule.title;
    await expect(page.getByRole('heading', { level: 1, name: schedule })).toBeVisible();
    const diag = await page.evaluate(() => {
      const d = document.documentElement;
      const wide = [...document.querySelectorAll('*')].filter((e) => {
        const r = e.getBoundingClientRect();
        return r.right > 361 || r.left < -1 || r.width > 361;
      }).slice(0, 25).map((e) => `${e.tagName}.${String(e.className).slice(0, 80)} ` +
        JSON.stringify(e.getBoundingClientRect()));
      return { iw: innerWidth, ih: innerHeight, vv: visualViewport?.scale, vw: visualViewport?.width,
        sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, wide };
    });
    console.log('DIAG', JSON.stringify(diag, null, 1));
    await shoot(page, '02-schedule');

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

    await page.goto(`${FAMILY_URL}/portal`);
    await toDark(page);
    await expect(page.getByRole('region', { name: P.nextLesson })).toBeVisible();
    await shoot(page, '06-home-dark');
    await page.context().close();
  });
});
