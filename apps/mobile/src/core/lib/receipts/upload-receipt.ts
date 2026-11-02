import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';
import { supabase } from '@/core/lib/http/supabase';
import type { Receipt } from './receipt';

/** The API signed the upload but Storage did not take the file. */
export class ReceiptUploadError extends Error {}

/**
 * POST /payments/receipt-upload-url, then the signed upload (docs/11 §3, P6): the API picks and
 * signs the path ({subscription_id}/{uuid}.{ext}); the file goes straight into the private
 * `receipts` bucket through the app's own Supabase URL. Resolves the path for POST /payments.
 */
export async function uploadReceipt(subscriptionId: string, receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/payments/receipt-upload-url', {
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
