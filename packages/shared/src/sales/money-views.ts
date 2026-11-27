import type { PaymentKind, PaymentMethod, StudentStatus } from '@ab/catalog';
import type { RenewalPricing } from '@ab/money';
import type { ThreadFile, ThreadMediaItem } from '../messaging';
import type { SalesMoneySubscriptionView, SalesStudentRef } from './student-file';

// Whitelisted responses of the salesperson's money endpoints (docs/16): only her student and the package
// she is creating or paying, never the fx internals (rate, provider, date), the quote source, notes or
// another family's data.

/** The transfer she recorded and the student's status right after it. */
export interface SalesPaymentView {
  id: string;
  subscription_id: string;
  student: SalesStudentRef & { status: StudentStatus };
  /** Always the package currency: her transfer is recorded in it only (400 currency_mismatch otherwise). */
  amount: number;
  currency: string;
  method: PaymentMethod;
  kind: PaymentKind;
  paid_at: string;
  note: string | null;
  created_at: string;
}

/** GET /sales/money/family: her students of this chat's family (all of them with sales.renew_any), each with its packages owed. */
export interface SalesFamilyStudent extends SalesStudentRef {
  status: StudentStatus;
  /**
   * false: not hers, listed through sales.renew_any (subscribe / renew / transfer / course days). Absent from old APIs = hers.
   * true for every child while SalesOwnershipRule does not enforce ownership.
   */
  mine?: boolean;
  open: SalesMoneySubscriptionView[];
  /** Renewal is her primary action: the package ended or is down to the renewal alert. */
  renew_due: boolean;
  /** The renewal's calculator inputs, from the last priced package (renewalPricing; pill discounts only). */
  renewal: RenewalPricing;
  /** students.teacher_id (the trial's teacher until she picks another), the picker's default. */
  teacher_id: string | null;
}

export interface SalesFamilyView {
  students: SalesFamilyStudent[];
}

/** One image / PDF the family sent in its chat (metadata only; the file through /:messageId). */
export type SalesChatReceipt = ThreadMediaItem;

/** A short-lived signed URL of one chat file (a thumbnail). */
export type SalesChatReceiptFile = ThreadFile;

/** The receipt path to send with POST /sales/payments. */
export interface SalesReceiptCopied {
  receipt_path: string;
}
