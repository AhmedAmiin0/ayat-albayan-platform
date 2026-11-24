import { DISCOUNTS } from '@ab/money';
import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { fillStable } from '../core/fill';

// Journey 7: sales mode books a free trial only; the receipt on a bank transfer is optional.

const SM = ar.salesMoney;

export async function registerWithTrial(page: Page, family: { name: string; guardian: string }): Promise<void> {
  await page.getByRole('button', { name: ar.inbox.registerNew }).click();
  const dialog = page.getByRole('dialog', { name: ar.inbox.registerNew });
  await fillStable(dialog.getByLabel(ar.leads.studentName), family.name);
  await fillStable(dialog.getByLabel(ar.guardians.name), family.guardian);
  const next = () => dialog.getByRole('button', { name: ar.booking.next }).click();
  await next();
  // The assign-to-teacher step: the assistant picks the teacher of the trial.
  await dialog.getByRole('radio', { name: /أبرار/ }).check();
  await next();
  await expect(dialog.getByText(ar.booking.trialFree)).toBeVisible();
  await next();
  const step = dialog.getByRole('region', { name: ar.booking.steps.slot });
  await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
  await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
  await next();
  await dialog.getByRole('button', { name: ar.booking.submit }).click();
  await expect(dialog.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
  await dialog.getByRole('button', { name: ar.inbox.subscription.backToChat }).click();
  await expect(dialog).toHaveCount(0);
}

/** The discount is the site's pills only (0/5/10/15 %, no free number). */
export async function saveSubscription(page: Page, pkg: string, title = SM.newSubscription): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: title });
  const pills = dialog.getByRole('group', { name: ar.subscriptions.discount }).getByRole('button');
  await expect(pills).toHaveText(DISCOUNTS.map((d) => ar.pricing.discounts[`${d}`]));
  await expect(dialog.getByRole('spinbutton', { name: ar.subscriptions.discount })).toHaveCount(0);
  await dialog.getByLabel(ar.subscriptions.package, { exact: true }).selectOption(pkg);
  await dialog.getByRole('button', { name: SM.saveSubscription }).click();
  const transfer = page.getByRole('dialog', { name: SM.stepTransfer });
  await expect(transfer).toBeVisible();
  return transfer;
}

/** Amount starts at what is due; the currency is the package's, read-only; receipt optional. */
export async function saveTransfer(page: Page, currency: string): Promise<Locator> {
  const transfer = page.getByRole('dialog', { name: SM.stepTransfer });
  await expect(transfer.getByLabel(SM.currency, { exact: true })).toHaveValue(currency);
  await expect(transfer.getByLabel(SM.amount, { exact: true })).not.toHaveValue('');
  await transfer.getByRole('button', { name: SM.saveTransfer }).click();
  const done = page.getByRole('dialog', { name: SM.becameSubscribed });
  await expect(done).toBeVisible();
  return done;
}

export async function expectInMyPayments(done: Locator, name: string): Promise<void> {
  const page = done.page();
  await done.getByRole('link', { name: SM.openMyPayments }).click();
  await page.waitForURL(/\/sales\/earnings/);
  await expect(page.getByRole('row').filter({ hasText: name }).first()).toBeVisible();
}

/** The renewal dialog opens prefilled from the last package. */
export async function renewFromChat(page: Page, pkg: string): Promise<Locator> {
  await page.getByRole('button', { name: ar.students.renew, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: ar.students.renew });
  await expect(dialog.getByLabel(ar.subscriptions.package, { exact: true })).toHaveValue(pkg);
  return saveSubscription(page, pkg, ar.students.renew);
}
