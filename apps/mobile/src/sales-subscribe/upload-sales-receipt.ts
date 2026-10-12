import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Receipt } from '@/payments/receipt';
import { ReceiptUploadError } from '@/payments/upload-receipt';

/**
 * The admin's upload (payments/upload-receipt) through the salesperson's endpoint: POST
 * /sales/payments/receipt-upload-url (her student's package only), then the signed upload into the
 * private `receipts` bucket. Resolves the path for POST /sales/payments.
 */
export async function uploadSalesReceipt(subscriptionId: string, receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/sales/payments/receipt-upload-url', {
    subscriptionId,
    mime: receipt.mime,
    size: receipt.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, receipt.bytes, { contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
