import type { Locator, Page } from '@playwright/test';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };

/** Every filter but the search box lives in the panel; the name ends with the active count. */
export async function openFilters(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: new RegExp(`^${ar.table.filter}`) }).click();
  return page.getByRole('dialog', { name: ar.table.filter });
}

/** Filters already apply as they change; this only closes the panel. */
export async function showResults(panel: Locator): Promise<void> {
  await panel.getByRole('button', { name: ar.table.showResults }).click();
}
