import type { StudentStatus } from '../enums/index.js';
import { DISCOUNTS, renewalPricing, type LastPackage, type RenewalPricing } from '../pricing/index.js';
import { isPackageEnded } from '../students/index.js';

// «جدّد الاشتراك» from the sales chat (owner 2026-10-26): which of her students is due for a renewal,
// and the calculator inputs it opens with (the admin's renewalPricing, from the last priced package).
// Pure; GET /sales/money/family returns both per student.

/** A package of the student, FIFO order (starts_on, created_at, id); price 0 = a trial. */
export type RenewalPackage = LastPackage & { price: number };

export interface SalesRenewalInput {
  status: StudentStatus;
  /** Lessons left across all the student's packages (studentRemaining). */
  remaining: number;
  /** settings.renewal_alert_remaining: the admin's «renewal due» task fires at this many lessons left. */
  threshold: number;
  packages: readonly RenewalPackage[];
}

export interface SalesRenewal {
  renew_due: boolean;
  renewal: RenewalPricing;
}

/**
 * Due when the package ended (pending_renewal, expired) or an active student is down to the admin's
 * renewal-alert threshold. The seed is renewalPricing of the last priced package; a discount that is
 * not one of the site's pills (the admin's free field) is dropped: she may only offer the pills.
 */
export function salesRenewal(input: SalesRenewalInput): SalesRenewal {
  const ended = isPackageEnded(input.status);
  const low = input.status === 'active' && input.remaining <= input.threshold;
  const last = input.packages.filter((p) => p.price > 0).at(-1);
  const seed = renewalPricing(last);
  const pill = DISCOUNTS.some((d) => d === seed.discount);
  return { renew_due: ended || low, renewal: pill ? seed : { ...seed, discount: 0 } };
}
