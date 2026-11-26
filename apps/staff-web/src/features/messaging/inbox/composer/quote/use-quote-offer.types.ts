import type { Rounding } from '@ab/money';
import type { Selection } from '@/features/finance/pricing';

/** `one`: one package's offer. `all`: the whole price list in one message. */
export type QuoteMode = 'one' | 'all';

/**
 * Everything the staff member chose on the sheet. Both modes read the same object, so the
 * country, students, discount and rounding survive a switch, and one debounce covers them all.
 */
export interface QuoteChoice extends Selection {
  /** How the discounted price reaches a whole unit; asked for only while there is a discount. */
  rounding: Rounding;
}
