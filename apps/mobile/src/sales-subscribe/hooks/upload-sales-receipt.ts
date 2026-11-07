import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import type { Receipt } from '@/core/lib/receipts/receipt';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

/**
 * The admin's upload (payments/upload-receipt) through the salesperson's endpoint: POST
 * /sales/payments/receipt-upload-url (her student's package only), then the signed upload into the
 * private `receipts` bucket. Resolves the path for POST /sales/payments.
 */
export async function uploadSalesReceipt(subscriptionId: string, receipt: Receipt, bind: { phone?: string } = {}): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/sales/payments/receipt-upload-url', {
    subscriptionId,
    mime: receipt.mime,
    size: receipt.size,
    ...bind,
  });
  const { error } = await uploadSigned(signed, { body: receipt.bytes, contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
