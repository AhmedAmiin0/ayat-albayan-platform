import type { Locator, Page } from '@playwright/test';
import { resolve } from 'node:path';
import { ar, expect } from './core/fixtures';
import { withSql } from './core/schedule';
import { stamp } from './people/users-control';

// Helpers of the «حسابي» specs (account*.spec.ts, R-ACC-01..05). Every run gets its own stamp,
// so the desktop and mobile projects never share an email, a phone or a name.
//
// Assumptions about the /account page (align the web page with these):
// - the page heading is ar.account.title;
// - each part is a <section aria-labelledby> whose heading is ar.account.<part>.title, so it is
//   the ARIA region of that name (name, phone, email, password, avatar);
// - inside a region: fields by ar.json label (ar.account.name.label, phone.label, email.label,
//   password.new, password.confirm, currentPassword) and one button ar.account.save;
// - the avatar region has a file input labelled ar.account.avatar.choose, then a button
//   ar.account.avatar.upload; the saved photo is an <img alt="ar.account.avatar.alt({name})">;
// - toasts show ar.account.toast.*, server errors show ar.account.errors.<code>.

const A = ar.account;

export const AVATAR_PNG = resolve(import.meta.dirname, '../fixtures/avatar.png');

interface AccountUser {
  email: string;
  password: string;
  fullName: string;
}

/** A dedicated login for one spec file (never the shared seeded USERS). */
export function accountUser(prefix: string): AccountUser & { run: string } {
  const run = stamp();
  return {
    run,
    email: `${prefix}-${run}@e2e.local`,
    password: `Acc-pass-e2e-${run}`,
    fullName: `حساب ${prefix} ${run}`,
  };
}

/** A fresh Saudi mobile number in E.164 (+9665 + 8 digits) from the run stamp. */
export const phoneOf = (run: string): string => `+96650${run.padStart(8, '0').slice(-7)}`;

export async function openAccount(page: Page): Promise<void> {
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: A.title, exact: true })).toBeVisible();
}

export type Part = 'name' | 'phone' | 'email' | 'password' | 'avatar';

export const region = (page: Page, part: Part): Locator => page.getByRole('region', { name: A[part].title, exact: true });

export const save = (section: Locator): Promise<void> =>
  section.getByRole('button', { name: A.save, exact: true }).click();

export const currentPassword = (section: Locator): Locator => section.getByLabel(A.currentPassword, { exact: true });

export const avatarAlt = (name: string): string => A.avatar.alt.replace('{name}', name);

export interface AccountRow {
  id: string;
  full_name: string;
  phone_e164: string | null;
  avatar_path: string | null;
  role: string;
  stored: number;
}

/** The profile row of `email` plus whether its avatar object exists in the private bucket. */
export async function accountRow(email: string): Promise<AccountRow | undefined> {
  const rows = await withSql((sql) => sql<AccountRow[]>`
    select p.id, p.full_name, p.phone_e164::text as phone_e164, p.avatar_path, p.role::text as role,
      (select count(*)::int from storage.objects o where o.bucket_id = 'avatars' and o.name = p.avatar_path) as stored
    from public.profiles p join auth.users u on u.id = p.id where u.email = ${email}`);
  return rows[0];
}
