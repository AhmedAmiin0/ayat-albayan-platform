import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Receipt } from '@/payments/receipt';
import { ReceiptUploadError } from '@/payments/upload-receipt';

/**
 * POST /assistant-pay/receipt-upload-url ({assistantId, mime, size}, as the web), then the signed
 * upload straight into the private bucket. Resolves the path sent with the statement's pay.
 */
export async function uploadStatementReceipt(assistantId: string, receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/assistant-pay/receipt-upload-url', {
    assistantId,
    mime: receipt.mime,
    size: receipt.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, receipt.bytes, { contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
