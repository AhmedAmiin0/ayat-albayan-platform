import { PAYMENT_ATTACHMENTS_MAX, type SalesChatReceipt } from '@ab/shared';
import type { AttachmentItem } from '@/features/payments/AttachmentItems';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';

// The transfer's «المرفقات» (R-ASST-04, owner 2026-10-12: optional, old students have no receipt): up to
// five, each a chat file already copied into the package's receipts (its path kept) or a file she picks,
// uploaded once on save.

export type ReceiptChoice =
  | { kind: 'chat'; messageId: string; subscriptionId: string; path: string; label: string }
  | { kind: 'file'; file: File };

/** The attachments that count for the package being paid: a chat copy made for another package does not. */
export function attachmentsFor(list: readonly ReceiptChoice[], subscriptionId: string): ReceiptChoice[] {
  return list.filter((c) => c.kind === 'file' || c.subscriptionId === subscriptionId);
}

/** A chat file added once per message (each pick is a new copy, so never by path); none past the maximum. */
export function addChatChoice(
  list: readonly ReceiptChoice[],
  choice: ReceiptChoice & { kind: 'chat' },
): { list: ReceiptChoice[]; problem: 'too_many_attachments' | null } {
  const same = (c: ReceiptChoice) => c.kind === 'chat' && c.messageId === choice.messageId && c.subscriptionId === choice.subscriptionId;
  if (list.some(same)) return { list: [...list], problem: null };
  if (list.length >= PAYMENT_ATTACHMENTS_MAX) return { list: [...list], problem: 'too_many_attachments' };
  return { list: [...list, choice], problem: null };
}

/** The chat messages already picked for this package: picking one again would only make another copy. */
export function pickedMessages(list: readonly ReceiptChoice[], subscriptionId: string): ReadonlySet<string> {
  return new Set(list.flatMap((c) => (c.kind === 'chat' && c.subscriptionId === subscriptionId ? [c.messageId] : [])));
}

/** How a chosen attachment is listed: the chat file's label, or the picked file's name. */
export function attachmentItem(c: ReceiptChoice, index: number): AttachmentItem {
  return c.kind === 'chat' ? { key: `chat-${c.subscriptionId}-${c.messageId}`, name: c.label } : { key: `file-${index}-${c.file.name}`, name: c.file.name };
}

/** An accessible name for one chat file: its caption (else «الإيصال»), its day, and «expired» when so. */
export function chatReceiptLabel(r: SalesChatReceipt): string {
  const day = dateLabel(r.created_at.slice(0, 10));
  const parts = [r.caption?.trim() || t.salesMoney.receipt, day];
  if (r.expired) parts.push(t.salesMoney.receiptExpired);
  return parts.join(' · ');
}
