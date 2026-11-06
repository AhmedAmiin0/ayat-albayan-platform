import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import type { Receipt } from '@/core/lib/receipts/receipt';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';

/**
 * POST /expenses/receipt-upload-url, then the signed upload into the private `receipts` bucket
 * (receipts/expenses/…, like the web). Resolves the path to send with the expense.
 */
export async function uploadExpenseReceipt(receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/expenses/receipt-upload-url', { mime: receipt.mime, size: receipt.size });
  const { error } = await uploadSigned(signed, { body: receipt.bytes, contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
