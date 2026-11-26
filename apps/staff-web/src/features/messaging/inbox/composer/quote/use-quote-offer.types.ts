import type { Rounding } from '@ab/money';
import type { Selection } from '@/features/finance/pricing';

/**
 * Everything the staff member chose on the sheet. Both modes read the same object, so the
 * country, students, discount and rounding survive a switch, and one debounce covers them all.
 */
export interface QuoteChoice extends Selection {
  /** How the discounted price reaches a whole unit; asked for only while there is a discount. */
  rounding: Rounding;
}
