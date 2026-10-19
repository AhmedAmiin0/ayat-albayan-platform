import type { Page } from '@playwright/test';
import { ar, expect } from './fixtures';

/** The chat header's «المزيد» (docs/20 W3): «تحقق من التسجيل», the renewals, the transfer and the course days. */
export const chatMore = (page: Page) =>
  page
    .locator('header', { has: page.getByRole('heading', { level: 2 }) })
    .getByRole('button', { name: ar.common.more, exact: true });

/** Opens «المزيد» and clicks its entry named `name`. */
export async function fromChatMore(page: Page, name: string): Promise<void> {
  await chatMore(page).click();
  await page.getByRole('button', { name, exact: true }).click();
}

/** `count` entries named `name` in the chat's «المزيد» (opened, then closed again). */
export async function expectInChatMore(page: Page, name: string, count = 1): Promise<void> {
  await chatMore(page).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(count);
  await chatMore(page).click();
}
