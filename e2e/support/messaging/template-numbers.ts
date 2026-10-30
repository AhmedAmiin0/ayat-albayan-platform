import { expect, type Page } from '@playwright/test';
import { ar } from '../fixtures';

// The templates section per number (owner 2026-10-18): each number has its own «مزامنة مع Meta».

type Line = 'notifications' | 'chat';
const p = ar.templates.perNumber;
const lineName = (line: Line): string => ar.enums.waLine[line];

/** One number's block on «التواصل» › «القوالب» (/admin/settings/communications?tab=templates). */
export const numberBlock = (page: Page, line: Line) => page.locator(`[data-testid="template-line"][data-line="${line}"]`);

/** Clicks that number's sync and waits for its success toast. */
export async function syncNumber(page: Page, line: Line): Promise<void> {
  await page.getByRole('button', { name: p.syncFor.replace('{line}', lineName(line)) }).click();
  await expect(page.getByText(p.synced.replace('{line}', lineName(line)))).toBeVisible();
}
