import type { Page } from '@playwright/test';
import { ar, expect } from './fixtures';

/** A 1×1 PNG: the smallest valid image for an invoice upload. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** On the invoice step (R-PAY-03): a device upload to the signed URL, until its preview shows, then on. */
export async function uploadInvoice(admin: Page): Promise<void> {
  await admin.getByLabel(ar.booking.invoice.upload).setInputFiles({ name: 'inv.png', mimeType: 'image/png', buffer: PNG });
  await expect(admin.getByRole('button', { name: ar.booking.invoice.remove })).toBeVisible();
  await admin.getByRole('button', { name: ar.booking.next }).click();
}
