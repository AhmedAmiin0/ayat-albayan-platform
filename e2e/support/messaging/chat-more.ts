import type { Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';

export const chatMore = (page: Page) =>
  page
    .locator('header', { has: page.getByRole('heading', { level: 2 }) })
    .getByRole('button', { name: ar.common.more, exact: true });

export async function fromChatMore(page: Page, name: string): Promise<void> {
  await chatMore(page).click();
  await page.getByRole('button', { name, exact: true }).click();
}

async function expectInChatMore(page: Page, name: string, count = 1): Promise<void> {
  await chatMore(page).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(count);
  await chatMore(page).click();
}

/** The chat header's visible renew action while her student is due. */
export const chatRenew = (page: Page) => page.getByRole('button', { name: ar.students.renew, exact: true });

/** When due, renew is visible and new subscription moves into the More menu. */
export async function expectRenewVisible(page: Page): Promise<void> {
  await expect(chatRenew(page)).toBeVisible();
  await expectInChatMore(page, ar.salesMoney.newSubscription);
}
