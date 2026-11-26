import { DEFAULT_ROUNDING, type Rounding } from '@ab/money';
import type { RoundingFacts } from './quote-sheet.types';

/**
 * Rounding only moves a discounted price, so without a discount the default is asked whatever was
 * chosen: the request and its cache key stay the calculator's own.
 */
export const askedRounding = (discount: number, chosen: Rounding): Rounding =>
  discount > 0 ? chosen : DEFAULT_ROUNDING;

/** A custom amount is the single offer's total itself, so there rounding has nothing to move. */
const typedTotal = (facts: RoundingFacts): boolean => facts.mode === 'one' && facts.customOn;

export const roundingShows = (facts: RoundingFacts): boolean =>
  facts.discount > 0 && !typedTotal(facts);
