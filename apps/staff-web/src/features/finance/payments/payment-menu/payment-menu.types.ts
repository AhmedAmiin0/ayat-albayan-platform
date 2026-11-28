import type { PaymentView } from '@/features/finance/payments/api';

export type PaymentAction = 'receipt' | 'attachments' | 'amount' | 'edit' | 'delete';

export interface PaymentMenuOptions {
  onAction: (p: PaymentView, action: PaymentAction) => void;
  /** Amount edits need payments.write, which PATCH /payments/:id requires. */
  canWrite: boolean;
}

export interface PaymentMenuEntry {
  action: PaymentAction;
  label: string;
  shows: (p: PaymentView, canWrite: boolean) => boolean;
}
