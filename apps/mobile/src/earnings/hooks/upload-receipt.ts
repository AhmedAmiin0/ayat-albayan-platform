import type { SignedUpload } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';
import type { Receipt } from '@/payments/receipt';
import { ReceiptUploadError } from '@/payments/upload-receipt';
import { supabase } from '@/core/lib/http/supabase';

/**
 * POST /teacher-earnings/:teacherId/receipt-upload-url, then the signed upload into the private
 * `receipts` bucket ({teacher_id}/{uuid}.{ext}). Resolves the path to send with the payment.
 */
export async function uploadTeacherReceipt(teacherId: string, receipt: Receipt): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', `/teacher-earnings/${teacherId}/receipt-upload-url`, {
    mime: receipt.mime,
    size: receipt.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, receipt.bytes, { contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
