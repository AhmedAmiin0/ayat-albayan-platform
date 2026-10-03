import { INVOICE_MAX_BYTES, INVOICE_MIMES } from './contract';

export type InvoiceProblem = 'invoice_type' | 'invoice_too_large';

/** Client-side check before the upload (the API and the bucket check again). */
export function invoiceProblem(file: File | null): InvoiceProblem | null {
  if (!file) return null;
  if (!(INVOICE_MIMES as readonly string[]).includes(file.type)) return 'invoice_type';
  return file.size > INVOICE_MAX_BYTES ? 'invoice_too_large' : null;
}

export const isImage = (mime: string): boolean => mime.startsWith('image/');
