import type { PaymentView } from '@ab/shared';

/** Does the payment have anything to show: its own receipt, or the booking invoice standing in. */
export function hasReceipt(p: Pick<PaymentView, 'receipt_path' | 'invoice_id'>): boolean {
  return p.receipt_path !== null || p.invoice_id !== null;
}

/**
 * Anything in «المرفقات»: a bank transfer may carry files (owner 2026-10-12) even with no receipt_path;
 * an older payment shows its receipt_path there. A row without receipt_path (the sales list) goes by method.
 */
export function hasAttachments(p: Pick<PaymentView, 'method'> & { receipt_path?: string | null }): boolean {
  return p.method === 'bank' || (p.receipt_path ?? null) !== null;
}

/** A PDF by its name or URL (the `.pdf` extension, the query string ignored). */
export const isPdfName = (name: string) => name.split('?')[0]?.toLowerCase().endsWith('.pdf') ?? false;

/** A PDF is opened outside the app, an image shown inline. The stored path or the signed URL says which. */
export function isPdfReceipt(p: Pick<PaymentView, 'receipt_path'>, url?: string): boolean {
  return (p.receipt_path !== null && isPdfName(p.receipt_path)) || (url !== undefined && isPdfName(url));
}
