import { INVOICE_MAX_BYTES, INVOICE_MIMES } from '@/features/teaching/booking/draft/contract';

export type InvoiceProblem = 'invoice_type' | 'invoice_too_large';

const HEIC = 'image/heic';

/**
 * The file's mime. Windows Chrome reports '' for a .heic photo; the extension says what it is
 * (the API reads the bytes anyway).
 */
export function invoiceMime(file: File): string {
  return file.type === '' && /\.hei[cf]$/i.test(file.name) ? HEIC : file.type;
}

/** Client-side check before the upload, against settings.upload_max_mb (the API and the bucket check again). */
export function invoiceProblem(file: File | null, maxBytes = INVOICE_MAX_BYTES): InvoiceProblem | null {
  if (!file) return null;
  if (!(INVOICE_MIMES as readonly string[]).includes(invoiceMime(file))) return 'invoice_type';
  return file.size > maxBytes ? 'invoice_too_large' : null;
}

export const isImage = (mime: string): boolean => mime.startsWith('image/');

/** An image a browser can draw: HEIC is allowed as an invoice but only Safari shows it. */
export const canShow = (mime: string): boolean => isImage(mime) && mime !== HEIC;
