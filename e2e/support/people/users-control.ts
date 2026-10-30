import type { Browser, Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { withSql } from '../core/schedule';
import { AR_LOCALE } from '../core/locale';

// Helpers of the «المستخدمون» specs (users-control*.spec.ts). Every run uses its own stamp, so the
// desktop and mobile projects never share an email or a name.

export const stamp = (): string => `${Date.now() % 1_000_000}${Math.floor(Math.random() * 90 + 10)}`;

export const detailDialog = (page: Page): Locator => page.getByRole('dialog', { name: ar.users.detail.title });

/** /admin/users, searched for `term`; the row's name button, ready to click. */
async function findUser(page: Page, term: string, name = term): Promise<Locator> {
  await page.goto('/admin/users');
  await page.getByRole('textbox', { name: ar.common.search, exact: true }).fill(term);
  const row = page.getByRole('button', { name, exact: true });
  await expect(row).toBeVisible();
  return row;
}

export async function openUser(page: Page, term: string, name = term): Promise<Locator> {
  await (await findUser(page, term, name)).click();
  const dialog = detailDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Fills the create dialog's identity fields. */
export async function fillIdentity(dialog: Locator, input: { name: string; email: string }): Promise<void> {
  await dialog.getByLabel(ar.users.form.fullName).fill(input.name);
  await dialog.getByLabel(ar.users.form.email).fill(input.email);
}

export async function openCreateDialog(page: Page): Promise<Locator> {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: ar.users.new }).click();
  const dialog = page.getByRole('dialog', { name: ar.users.create.title });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** The one-time password or link the result panel shows; closes the panel. */
export async function takeIssued(page: Page, title: string): Promise<string> {
  const dialog = page.getByRole('dialog', { name: title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(ar.users.result.once)).toBeVisible();
  const value = (await dialog.getByTestId('issued-credential').textContent()) ?? '';
  await dialog.getByRole('button', { name: ar.users.result.close }).click();
  await expect(dialog).toBeHidden();
  return value;
}

/** Submits the login form in a fresh browser context; the page is returned open. */
export async function signInAs(browser: Browser, creds: { email: string; password: string }): Promise<Page> {
  const ctx = await browser.newContext({ locale: AR_LOCALE });
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByLabel(ar.auth.email).fill(creds.email);
  await page.getByLabel(ar.auth.password).fill(creds.password);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  return page;
}

/** The login left /login (the home of the role loaded). */
export const expectSignedIn = (page: Page) => expect(page).not.toHaveURL(/\/login/);

/**
 * The login was refused: the form shows its error (every refusal ends in that alert, a sign-in in a
 * navigation away), the form is back (not submitting) and the URL is still /login.
 */
export async function expectRefused(page: Page): Promise<void> {
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: ar.auth.submit })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
}

export const profileOf = (email: string) =>
  withSql((sql) => sql<{ id: string; role: string; full_name: string }[]>`
    select p.id, p.role::text, p.full_name from public.profiles p join auth.users u on u.id = p.id where u.email = ${email}`);

export const dropLogins = (emails: string[]) =>
  withSql((sql) => sql`delete from auth.users where email = any(${emails})`);
