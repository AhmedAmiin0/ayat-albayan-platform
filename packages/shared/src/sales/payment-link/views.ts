import type { Duration, PackageSize } from '../../enums/index.js';
import type { SalesQuoteView, SalesStudentRef } from '../money-views.js';
import type { PaymentLinkKind, PaymentLinkStatus } from './schemas.js';

/** One payment link as its assistant (or an admin) sees it. */
export interface PaymentLinkView {
  id: string;
  /** https://<web>/pay/<token>: what she sends in the chat. */
  url: string;
  kind: PaymentLinkKind;
  status: PaymentLinkStatus;
  amount: number;
  currency: string;
  /** The calculator price of the package when the link was made. */
  reference_price: number;
  student: SalesStudentRef;
  subscription_id: string | null;
  /** null = a custom lesson count. */
  package: PackageSize | null;
  lessons: number;
  duration: Duration;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

/** POST /sales/payment-links/quote: the reference price and the admin's cap on the agreed amount. */
export interface PaymentLinkQuoteView {
  quote: SalesQuoteView;
  /** settings max_discount_pct; null = no cap. */
  max_discount_pct: number | null;
  /** The lowest amount allowed (null = anything above 0). */
  min_amount: number | null;
}

/** GET /pay/:token (public): no personal data beyond the first name. `processing` = an async payment pending. */
export interface PublicPaymentLink {
  status: PaymentLinkStatus | 'processing';
  first_name: string;
  amount: number;
  currency: string;
  package: PackageSize | null;
  lessons: number;
}

/** GET /stripe/feature: 404 = the build has no Stripe at all. */
export interface StripeFeature {
  stripe: boolean;
}
