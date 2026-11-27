import { teacherEarningCalls } from '@ab/client-core';
import { teacherReceiptUploadSchema } from '@ab/money';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import type { Receipt } from '@/core/lib/receipts/receipt';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';
import { uploadSigned } from '@/core/lib/http/upload-slot';

const calls = teacherEarningCalls({ apiFetch, apiSend });

/**
 * POST /teacher-earnings/:teacherId/receipt-upload-url, then the signed upload into the private
 * `receipts` bucket ({teacher_id}/{uuid}.{ext}). Resolves the path to send with the payment.
 */
export async function uploadTeacherReceipt(teacherId: string, receipt: Receipt): Promise<string> {
  const slot = teacherReceiptUploadSchema.parse({ mime: receipt.mime, size: receipt.size });
  const signed = await calls.receiptUploadUrl(teacherId, slot);
  const { error } = await uploadSigned(signed, { body: receipt.bytes, contentType: receipt.mime });
  if (error) throw new ReceiptUploadError(error.message);
  return signed.path;
}
