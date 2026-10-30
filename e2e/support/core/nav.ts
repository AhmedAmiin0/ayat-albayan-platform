import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../fixtures';

// The shell below 900px (owner, 2026-10-05: "make it simpler"): ONE compact top bar; the section
// nav, theme, language and logout sit behind «القائمة» in a sheet. The mobile project's Pixel 7
// (412px) and any spec that sizes a phone/tablet viewport reach them the same way.

type Dict = Pick<typeof ar, 'nav'>;

/** The wide sidebar / header from Tailwind's `shell` breakpoint (900px). */
const SHELL = 900;

/**
 * Where the nav and the account controls live: the «القائمة» sheet below 900px (opened here
 * unless it already is), the page itself from 900px. `dict`: en.json once the UI is English.
 */
export async function openNav(page: Page, dict: Dict = ar): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 1280) >= SHELL) return page.locator('body');
  const sheet = page.getByRole('dialog', { name: dict.nav.menu });
  if (!(await sheet.isVisible())) await page.getByRole('button', { name: dict.nav.menu, exact: true }).click();
  await expect(sheet).toBeVisible();
  return sheet;
}
