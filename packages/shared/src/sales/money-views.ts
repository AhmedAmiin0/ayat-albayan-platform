import type { Duration, PackageSize, PaymentKind, PaymentMethod, StudentStatus, SubscriptionStatus } from '../enums/index.js';
import type { Quote } from '../pricing/quote.js';
import type { RenewalPricing } from '../pricing/index.js';

// Whitelisted responses of the salesperson's money endpoints (docs/16): only her student and the package
// she is creating or paying, never the fx internals (rate, provider, date), the quote source, notes or
// another family's data.

/** The quote she tells the family: the price to transfer, nothing about how it was converted. */
export type SalesQuoteView = Pick<Quote, 'package' | 'lessons' | 'duration' | 'currency' | 'discount' | 'afterDiscount' | 'perLesson'>;

export interface SalesStudentRef {
  id: string;
  code: string;
  name: string;
}

/** A package of her student: what it costs, what was paid, what is still due. */
export interface SalesMoneySubscriptionView {
  id: string;
  student: SalesStudentRef;
  /** null = a custom lesson count. */
  package: PackageSize | null;
  duration: Duration;
  lessons_total: number;
  /** Taken before the platform (owner 2026-10-28); absent from older APIs. */
  lessons_used_before?: number;
  price: number;
  currency: string;
  starts_on: string;
  status: SubscriptionStatus;
  paid: number;
  /** max(0, price − paid). */
  due: number;
}

/** The transfer she recorded, and the student's status right after it («مشترك» once a trial pays). */
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
  /** false: not hers, listed through sales.renew_any (subscribe / renew / transfer only). Absent from old APIs = hers. */
  mine?: boolean;
  open: SalesMoneySubscriptionView[];
  /** «جدّد الاشتراك» is her primary action: the package ended, or an active one is down to the renewal alert. */
  renew_due: boolean;
  /** The renewal's calculator inputs, from the last priced package (renewalPricing; pill discounts only). */
  renewal: RenewalPricing;
}

export interface SalesFamilyView {
  students: SalesFamilyStudent[];
}

/** One image / PDF the family sent in its chat (metadata only; the file through /:messageId). */
export interface SalesChatReceipt {
  message_id: string;
  created_at: string;
  mime: string;
  caption: string | null;
  /** Too old to fetch from WhatsApp and never saved: it cannot be used. */
  expired: boolean;
}

/** A short-lived signed URL of one chat file (a thumbnail). */
export interface SalesChatReceiptFile {
  url: string;
  expires_at: string;
  mime: string;
}

/** The receipt path to send with POST /sales/payments. */
export interface SalesReceiptCopied {
  receipt_path: string;
}
