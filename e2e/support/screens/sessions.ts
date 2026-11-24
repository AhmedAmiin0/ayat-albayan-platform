import type { Browser, BrowserContextOptions, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { AR_LOCALE } from '../core/locale';
import { guardianSignIn, studentSignIn } from '../people/family-portal';
import type { StoreFamily } from '../store/store.types';
import { STAFF_USERS, studentCode } from './seed.ts';
import type { StaffRole } from './screens.types.ts';

type State = BrowserContextOptions['storageState'];

async function signedIn(browser: Browser, signIn: (page: Page) => Promise<void>): Promise<State> {
  const context = await browser.newContext({ locale: AR_LOCALE, timezoneId: 'Asia/Riyadh' });
  const page = await context.newPage();
  await signIn(page);
  const state = await context.storageState();
  await context.close();
  return state;
}

/** A staff login through the real form; it lands on the role's home. */
export function staffState(browser: Browser, input: { base: string; role: StaffRole }) {
  const user = STAFF_USERS[input.role];
  return signedIn(browser, async (page) => {
    await page.goto(`${input.base}/login`);
    await page.getByLabel(ar.auth.email).fill(user.email);
    await page.getByLabel(ar.auth.password).fill(user.password);
    await page.getByRole('button', { name: ar.auth.submit, exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  });
}

export function guardianState(browser: Browser, phone: string): Promise<State> {
  return signedIn(browser, (page) => guardianSignIn(page, phone));
}

/** The first child signs in with the student code and a password set by the guardian's code. */
export async function studentState(
  browser: Browser,
  family: Pick<StoreFamily, 'phone' | 'first' | 'second'>,
): Promise<State> {
  const code = await studentCode(family.first.id);
  const portal = { phone: family.phone, first: { ...family.first, code }, second: family.second };
  return signedIn(browser, (page) => studentSignIn(page, portal));
}
