import type { Locator, Page } from '@playwright/test';
import { ar, expect } from './fixtures';

// Below 900px the section nav, theme, language and logout sit behind the menu sheet.

type Dict = Pick<typeof ar, 'nav'>;

/** The wide sidebar / header from Tailwind's `shell` breakpoint (900px). */
const SHELL = 900;

/** The menu sheet below 900px (opened here if needed), the page itself from 900px. */
export async function openNav(page: Page, dict: Dict = ar): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 1280) >= SHELL) return page.locator('body');
  const sheet = page.getByRole('dialog', { name: dict.nav.menu });
  if (!(await sheet.isVisible())) await page.getByRole('button', { name: dict.nav.menu, exact: true }).click();
  await expect(sheet).toBeVisible();
  return sheet;
}
