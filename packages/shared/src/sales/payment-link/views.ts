import type { PackageSize } from '@ab/catalog';
import type { PaymentLinkStatus } from './schemas';

/** GET /pay/:token (public): no personal data beyond the first name. `processing` = an async payment pending. */
export interface PublicPaymentLink {
  status: PaymentLinkStatus | 'processing';
  first_name: string;
  amount: number;
  currency: string;
  package: PackageSize | null;
  lessons: number;
  /** The server's Stripe key is a sandbox one: the page says it is a test (live: no notice). */
  sandbox: boolean;
}
