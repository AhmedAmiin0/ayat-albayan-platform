import type { Page } from '@playwright/test';
import { ar, expect } from '../fixtures';

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
async function expectInChatMore(page: Page, name: string, count = 1): Promise<void> {
  await chatMore(page).click();
  await expect(page.getByRole('button', { name, exact: true })).toHaveCount(count);
  await chatMore(page).click();
}

/** «جدّد الاشتراك», the chat header's visible action while her student is due (owner 2026-10-26). */
export const chatRenew = (page: Page) => page.getByRole('button', { name: ar.students.renew, exact: true });

/** Due for renewal: «جدّد الاشتراك» is visible, «اشتراك جديد» moved into «المزيد». */
export async function expectRenewVisible(page: Page): Promise<void> {
  await expect(chatRenew(page)).toBeVisible();
  await expectInChatMore(page, ar.salesMoney.newSubscription);
}
