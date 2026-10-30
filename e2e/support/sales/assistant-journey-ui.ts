import { DISCOUNTS } from '@ab/shared';
import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { fillStable } from '../core/fill';

// The assistant's buttons in a sales chat, driven like a person would (journey 7, owner 2026-10-15):
// «تسجيل طالب جديد» (the booking wizard in sales mode: a free trial only), «اشتراك جديد» / «جدّد الاشتراك»
// (the calculator with the site's discount pills) and «سجّل التحويل البنكي» (receipt optional).

const SM = ar.salesMoney;

/** «تسجيل طالب جديد»: the child + guardian, «أبرار», the free trial next Sunday 16:00 Riyadh, back to the chat. */
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

/**
 * The open «اشتراك جديد» dialog (`title`: «جدّد الاشتراك» for a renewal): the discount is the site's pills
 * only (0 / 5 / 10 / 15 %, no free number), `pkg` is picked and the package saved; the transfer step opens next.
 */
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

/**
 * The open «سجّل التحويل البنكي» step: the amount starts at what is due, the currency is the package's
 * (read-only), no receipt is attached (optional). Saved → «أصبح الطالب مشتركًا».
 */
export async function saveTransfer(page: Page, currency: string): Promise<Locator> {
  const transfer = page.getByRole('dialog', { name: SM.stepTransfer });
  await expect(transfer.getByLabel(SM.currency, { exact: true })).toHaveValue(currency);
  await expect(transfer.getByLabel(SM.amount, { exact: true })).not.toHaveValue('');
  await transfer.getByRole('button', { name: SM.saveTransfer }).click();
  const done = page.getByRole('dialog', { name: SM.becameSubscribed });
  await expect(done).toBeVisible();
  return done;
}

/** «مدفوعاتي» from the result dialog: her payments list has a row for the child. */
export async function expectInMyPayments(done: Locator, name: string): Promise<void> {
  const page = done.page();
  await done.getByRole('link', { name: SM.openMyPayments }).click();
  await page.waitForURL(/\/sales\/earnings/);
  await expect(page.getByRole('row').filter({ hasText: name }).first()).toBeVisible();
}

/** «جدّد الاشتراك» from the chat: the dialog opens prefilled from the last package (`pkg`), then is saved. */
export async function renewFromChat(page: Page, pkg: string): Promise<Locator> {
  await page.getByRole('button', { name: ar.students.renew, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: ar.students.renew });
  await expect(dialog.getByLabel(ar.subscriptions.package, { exact: true })).toHaveValue(pkg);
  return saveSubscription(page, pkg, ar.students.renew);
}
