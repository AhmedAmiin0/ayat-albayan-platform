import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';
import { supabase } from '@/core/lib/http/supabase';
import type { Receipt } from '@/payments/receipt';
import { ReceiptUploadError } from '@/payments/upload-receipt';

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
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, receipt.bytes, { contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
