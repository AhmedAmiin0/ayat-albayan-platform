import { LOCALE_STORAGE_KEY, offerText, quote } from '@ab/shared';
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';

// docs/08 §3: «انسخ العرض للعميل» copies the site's Arabic offer text and «أرسله على واتساب»
// links to wa.me with the same text, in Arabic even when the staff UI is English. Kuwait, 3 lessons
// a week, 45 minutes needs no FX rate (catalog price in KWD), so the expected text is computed.

const KW = quote({ tier: 'standard', duration: 45, country: 'KW', students: 1, discount: 0 });
const EXPECTED = offerText(KW, ar.pricing);

async function pick(page: Page, step: string, option: string): Promise<void> {
  const group = page.getByRole('group', { name: step, exact: true });
  await group.getByRole('button', { name: option, exact: true }).click();
}

async function chooseKuwait(page: Page, dict: typeof ar): Promise<void> {
  await pick(page, dict.pricing.steps.country, dict.pricing.countries.KW);
  await pick(page, dict.pricing.steps.frequency, dict.pricing.frequencies.standard);
  await pick(page, dict.pricing.steps.duration, dict.pricing.durations['45']);
  const result = page.getByRole('region', { name: dict.pricing.resultTitle });
  await expect(result.getByRole('figure', { name: dict.pricing.packagePrice })).toContainText(
    `18 ${dict.pricing.currencies.KWD}`,
  );
}

function waText(href: string | null): string | null {
  return new URL(href ?? 'about:blank').searchParams.get('text');
}

test.describe('price offer actions (docs/08 §3)', () => {
  test('copy puts the Arabic offer text on the clipboard and the WhatsApp link carries it', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/admin/pricing');
    await chooseKuwait(page, ar);

    await page.getByRole('button', { name: ar.pricing.cta }).click();
    await expect(page.getByText(ar.pricing.copied)).toBeVisible();
    const clip = String(await page.evaluate('navigator.clipboard.readText()'));
    expect(clip).toBe(EXPECTED);
    expect(clip).toContain(ar.pricing.packages.standard.name);
    expect(clip).toContain(`18 ${ar.pricing.currencies.KWD}`);

    const link = page.getByRole('link', { name: ar.pricing.sendWhatsapp });
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(waText(href)).toBe(EXPECTED);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('an English UI still sends the Arabic offer text', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.addInitScript(
      ([key]) => localStorage.setItem(key ?? '', 'en'),
      [LOCALE_STORAGE_KEY],
    );
    await page.goto('/admin/pricing');
    await expect(page.getByRole('heading', { level: 1, name: en.pricing.title })).toBeVisible();
    await chooseKuwait(page, en as unknown as typeof ar);

    const href = await page.getByRole('link', { name: en.pricing.sendWhatsapp }).getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const text = waText(href);
    expect(text).toBe(EXPECTED);
    expect(text).toContain(ar.pricing.waIntro);
    expect(text).not.toContain(en.pricing.sendWhatsapp);
  });
});
