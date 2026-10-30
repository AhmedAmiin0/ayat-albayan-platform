import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { seedPackageStudent, subscriptionStatus } from '../../support/finance/money';
import { RECEIPT_PNG, uniqueName } from '../../support/finance/money-extra';
import { resetAbrar, withSql } from '../../support/schedule';

// Payments page + receipts (R-PAY-01): «تسجيل دفعة» from /admin/payments with a receipt picked
// through the file input (an in-memory PNG), the row in the list, «عرض الإيصال» through the
// signed URL, the stored object in the private bucket, and a failed upload that keeps the form.

const UPLOAD = '**/storage/v1/object/upload/sign/**';

interface Paid {
  amount: number;
  receipt_path: string | null;
  stored: number;
}

async function paymentsOf(subscriptionId: string): Promise<Paid[]> {
  return withSql((sql) => sql<Paid[]>`
    select p.amount::float as amount, p.receipt_path,
      (select count(*)::int from storage.objects o where o.bucket_id = 'receipts' and o.name = p.receipt_path) as stored
    from public.payments p where p.subscription_id = ${subscriptionId}`);
}

/** «تسجيل دفعة»: search the student, then their package (every open one, not only the unpaid list). */
async function openForm(page: Page, seed: { subscriptionId: string; student: string }): Promise<Locator> {
  await page.goto('/admin/payments');
  await page.getByRole('button', { name: ar.payments.record }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('searchbox', { name: ar.payments.mobile.chooseStudent }).fill(seed.student);
  await dialog.getByRole('button', { name: new RegExp(seed.student) }).click();
  await dialog.getByLabel(ar.payments.mobile.chooseSubscription, { exact: true }).selectOption(seed.subscriptionId);
  // The receipt's input; «المرفقات» (bank only, 2026-10-12) is the `multiple` one.
  await dialog.locator('input[type=file]:not([multiple])').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: RECEIPT_PNG });
  await expect(dialog.getByRole('img', { name: ar.payments.receipt })).toBeVisible(); // local preview
  return dialog;
}

const submit = (dialog: Locator) => dialog.getByRole('button', { name: ar.payments.record, exact: true });

test.describe('payments page and receipts (R-PAY-01)', () => {
  test('record with a receipt → row in the list → receipt viewable via a signed URL; package active', async ({ asRole }) => {
    const student = uniqueName('هدى');
    const seed = await seedPackageStudent({ teacherId: await resetAbrar(), paid: false, guardian: 'أم هدى', student });
    const page = await asRole('admin');
    const dialog = await openForm(page, { subscriptionId: seed.subscriptionId, student });
    await expect(dialog.getByLabel(new RegExp(ar.payments.amount))).toHaveValue(String(seed.price));
    await submit(dialog).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);

    const [paid, ...rest] = await paymentsOf(seed.subscriptionId);
    expect(rest).toEqual([]);
    expect(paid).toMatchObject({ amount: seed.price, stored: 1 });
    expect(paid?.receipt_path).toMatch(new RegExp(`^${seed.subscriptionId}/.+\\.png$`));
    await expect.poll(() => subscriptionStatus(seed.subscriptionId)).toBe('active');

    // The newest payment leads the list: student, amount, method, receipt button.
    const line = page.getByRole('row').filter({ hasText: student });
    await expect(line).toContainText(String(seed.price));
    await expect(line).toContainText(ar.enums.paymentMethod.bank);
    await line.getByRole('button', { name: ar.payments.viewReceipt }).click();
    const viewer = page.getByRole('dialog', { name: ar.payments.receipt });
    const image = viewer.getByRole('img', { name: ar.payments.receipt });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((el) => (el as unknown as { naturalWidth: number }).naturalWidth)).toBeGreaterThan(0);
    const src = await image.getAttribute('src');
    expect(src).toBeTruthy();
    expect((await page.request.get(src ?? '')).status()).toBe(200);
    await expect(viewer.getByRole('link', { name: ar.payments.openReceipt })).toBeVisible();
  });

  test('a failed receipt upload shows an error and keeps the form; the retry then records once', async ({ asRole }) => {
    const student = uniqueName('سلمى');
    const seed = await seedPackageStudent({ teacherId: await resetAbrar(), paid: false, guardian: 'أم سلمى', student });
    const page = await asRole('admin');
    const dialog = await openForm(page, { subscriptionId: seed.subscriptionId, student });
    await page.route(UPLOAD, (route) => route.abort());
    await submit(dialog).click();

    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel(new RegExp(ar.payments.amount))).toHaveValue(String(seed.price));
    await expect(dialog.getByRole('img', { name: ar.payments.receipt })).toBeVisible(); // file kept
    expect(await paymentsOf(seed.subscriptionId)).toEqual([]);
    expect(await subscriptionStatus(seed.subscriptionId)).toBe('unpaid');

    await page.unroute(UPLOAD);
    await submit(dialog).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);
    const stored = await paymentsOf(seed.subscriptionId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ amount: seed.price, stored: 1 });
  });
});
