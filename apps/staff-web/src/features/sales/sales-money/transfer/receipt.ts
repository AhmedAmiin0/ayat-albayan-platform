import type { SalesChatReceipt } from '@ab/shared';
import { PAYMENT_ATTACHMENTS_MAX } from '@ab/money';
import type { AttachmentItem } from '@/features/finance/payments/attachments/AttachmentItems';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// Attachments are optional (R-ASST-04; old students have no receipt), up to five, uploaded on save.

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

/** An accessible name: caption or a default, its day, and whether it expired. */
export function chatReceiptLabel(r: SalesChatReceipt): string {
  const day = dateLabel(r.created_at.slice(0, 10));
  const parts = [r.caption?.trim() || t.salesMoney.receipt, day];
  if (r.expired) parts.push(t.salesMoney.receiptExpired);
  return parts.join(' · ');
}
