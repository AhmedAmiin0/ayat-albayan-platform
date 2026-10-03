import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Receipt } from '@/payments/receipt';

/** The API signed the upload but Storage did not take the file. */
export class InvoiceUploadError extends Error {}

/**
 * POST /booking/invoice-upload-url, then the signed upload: the API picks and signs the path
 * ({clientRequestId}/{uuid}.{ext}) and the file goes straight into the private `invoices` bucket.
 * `requestId` is the wizard's: the same one POST /booking sends, or the API refuses the path.
 * Resolves the path for the booking's `invoice`.
 */
export async function uploadInvoice(requestId: string, receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/booking/invoice-upload-url', {
    clientRequestId: requestId,
    mime: receipt.mime,
    size: receipt.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, receipt.bytes, { contentType: receipt.mime });
  if (error) throw new InvoiceUploadError(error.message);
  return signed.path;
}
