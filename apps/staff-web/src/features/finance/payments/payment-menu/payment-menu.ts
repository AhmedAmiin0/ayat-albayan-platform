import type { RowMenuItem } from '@ab/web-kit';
import { t } from '@ab/web-kit';
import type { PaymentView } from '@/features/finance/payments/api';
import { amountEditable } from '@/features/finance/payments/amount/amount-check';
import type { PaymentMenuEntry, PaymentMenuOptions } from './payment-menu.types';


const hasReceipt = (p: PaymentView): boolean => Boolean(p.receipt_path ?? p.invoice_id);
const hasAttachments = (p: PaymentView): boolean => p.method === 'bank' || Boolean(p.receipt_path);
const always = (): boolean => true;
const amountFixable = (p: PaymentView, canWrite: boolean): boolean => canWrite && amountEditable(p);

/** Order is the menu's: views first, then edits, delete last (UX-7, docs/65). */
const ENTRIES: readonly PaymentMenuEntry[] = [
  { action: 'receipt', label: t.payments.viewReceipt, shows: hasReceipt },
  { action: 'attachments', label: t.payments.viewAttachments, shows: hasAttachments },
  { action: 'amount', label: t.payments.editAmount.action, shows: amountFixable },
  { action: 'edit', label: t.payments.editDetails, shows: always },
  { action: 'delete', label: t.common.delete, shows: always },
];

export function paymentMenu(
  p: PaymentView,
  { onAction, canWrite }: PaymentMenuOptions,
): RowMenuItem[] {
  return ENTRIES.filter((e) => e.shows(p, canWrite)).map((e) => ({
    id: e.action,
    label: e.label,
    danger: e.action === 'delete',
    onSelect: () => onAction(p, e.action),
  }));
}
