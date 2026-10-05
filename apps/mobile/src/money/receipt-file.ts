import type { PaymentView } from '@ab/shared';

/** Does the payment have anything to show: its own receipt, or the booking invoice standing in. */
export function hasReceipt(p: Pick<PaymentView, 'receipt_path' | 'invoice_id'>): boolean {
  return p.receipt_path !== null || p.invoice_id !== null;
}

const isPdfName = (name: string) => name.split('?')[0]?.toLowerCase().endsWith('.pdf') ?? false;

/** A PDF is opened outside the app, an image shown inline. The stored path or the signed URL says which. */
export function isPdfReceipt(p: Pick<PaymentView, 'receipt_path'>, url?: string): boolean {
  return (p.receipt_path !== null && isPdfName(p.receipt_path)) || (url !== undefined && isPdfName(url));
}
