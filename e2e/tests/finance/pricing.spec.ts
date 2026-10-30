import { basePrice } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';

// docs/08: the staff price calculator quotes the site's catalog in the guardian's currency, and
// any other country in USD at the stored rate. The API's FX_API_URL is unroutable in e2e, so the
// USD price can only come from the row the global setup seeds.

/** The SAR→USD rate e2e/support/db.ts `seedFxRate()` stores after `resetDb()`. */
const SEEDED_USD_RATE = 0.266667;

async function pick(page: Page, step: string, option: string): Promise<void> {
  const group = page.getByRole('group', { name: step, exact: true });
  await group.getByRole('button', { name: option, exact: true }).click();
}

test.describe('price calculator (docs/08)', () => {
  test('Kuwait is quoted in KWD from the catalog, another country in USD at the seeded rate', async ({
    asRole,
  }) => {
    const page = await asRole('admin');
    await page.goto('/admin/pricing');
    await expect(page.getByRole('heading', { level: 1, name: ar.pricing.title })).toBeVisible();

    await pick(page, ar.pricing.steps.country, ar.pricing.countries.KW);
    await pick(page, ar.pricing.steps.frequency, ar.pricing.frequencies.standard);
    await pick(page, ar.pricing.steps.duration, ar.pricing.durations['45']);

    const result = page.getByRole('region', { name: ar.pricing.resultTitle });
    const price = result.getByRole('figure', { name: ar.pricing.packagePrice });
    await expect(
      result.getByRole('heading', { name: ar.pricing.packages.standard.name }),
    ).toBeVisible();
    await expect(price).toContainText(`18 ${ar.pricing.currencies.KWD}`); // ceil(180 / 10)

    // docs/08 §1: USD = ceil(round2(base × rate)); the standard package at 45 minutes is 180 SAR.
    const base = basePrice('standard', 45);
    const usd = Math.ceil(Math.round(base * SEEDED_USD_RATE * 100) / 100);
    await pick(page, ar.pricing.steps.country, ar.pricing.otherCountry);
    await expect(price).toContainText(`${usd} ${ar.pricing.currencies.USD}`);
    await expect(result).toContainText(ar.pricing.fx.rateDate.replace('{date}', '').trim());
    await expect(result.getByRole('link', { name: ar.pricing.fx.attribution })).toBeVisible();
  });
});
