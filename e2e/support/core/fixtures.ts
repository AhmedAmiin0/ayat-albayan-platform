import { test as base, expect, type Page } from '@playwright/test';
import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { authFile, USERS } from '../users';
import { AR_LOCALE } from './locale';

type Role = keyof typeof USERS;

/** Logs in through the real login form. */
export async function loginViaUi(page: Page, role: Role): Promise<void> {
  const user = USERS[role];
  await page.goto('/login');
  await page.getByLabel(ar.auth.email).fill(user.email);
  await page.getByLabel(ar.auth.password).fill(user.password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
}

/**
 * `asRole('admin')` gives a page already signed in via the saved storageState
 * (created by auth.setup.ts), so journeys skip the login form.
 */
export const test = base.extend<{ asRole: (role: Role) => Promise<Page> }>({
  asRole: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (role) => {
      const ctx = await browser.newContext({ storageState: authFile(role), locale: AR_LOCALE });
      contexts.push(ctx);
      return ctx.newPage();
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { ar, expect };
