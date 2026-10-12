import type { SalesChatReceipt } from '@ab/shared';
import { receiptProblem } from '@/features/payments/ReceiptField';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';

// The transfer's receipt (R-ASST-04): required, either a chat file already copied into the package's
// receipts (its path kept) or a file she picks, uploaded once on save.

export type ReceiptChoice =
  | { kind: 'chat'; messageId: string; subscriptionId: string; path: string }
  | { kind: 'file'; file: File };

/** The receipt as a whole, for the package being paid: a chat copy made for another package does not count. */
export function receiptFor(choice: ReceiptChoice | null, subscriptionId: string): ReceiptChoice | null {
  if (choice?.kind === 'chat' && choice.subscriptionId !== subscriptionId) return null;
  return choice;
}

/** An accessible name for one chat file: its caption (else «الإيصال»), its day, and «expired» when so. */
export function chatReceiptLabel(r: SalesChatReceipt): string {
  const day = dateLabel(r.created_at.slice(0, 10));
  const parts = [r.caption?.trim() || t.salesMoney.receipt, day];
  if (r.expired) parts.push(t.salesMoney.receiptExpired);
  return parts.join(' · ');
}

/** What blocks the save on the receipt: none chosen, or an uploaded file of the wrong type / too large. */
export function receiptError(choice: ReceiptChoice | null, maxBytes: number): string | null {
  if (!choice) return t.salesMoney.receiptRequired;
  const bad = choice.kind === 'file' ? receiptProblem(choice.file, maxBytes) : null;
  return bad && t.salesMoney.error[bad];
}
