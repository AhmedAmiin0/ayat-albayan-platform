import type { Locator, Page } from '@playwright/test';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };

/**
 * Opens a table's «تصفية» panel (owner, 2026-10-05: one search box + «تصفية» above each table;
 * every other filter lives in the panel). The button's name ends with the active count when any
 * filter is set. Returns the panel dialog.
 */
export async function openFilters(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: new RegExp(`^${ar.table.filter}`) }).click();
  return page.getByRole('dialog', { name: ar.table.filter });
}

/** Closes the panel with «عرض النتائج» (filters already applied as they changed). */
export async function showResults(panel: Locator): Promise<void> {
  await panel.getByRole('button', { name: ar.table.showResults }).click();
}
