import { priceListQueryOptions } from '@ab/client-core';
import { DEFAULT_ROUNDING, offerText, priceListText, type Rounding } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { apiFetch } from '@ab/web-kit';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { quoteQuery } from '@/features/finance/pricing';
import { useQuoteCustom } from './use-quote-custom';
import type { QuoteChoice } from './use-quote-offer.types';

// Both texts are Arabic whatever the UI language: they are the client's message.

/**
 * Rounding only moves a discounted price, so without a discount none is asked for: the request
 * and its cache key stay the calculator's own, whatever was chosen while there was a discount.
 */
const roundingOf = (asked: QuoteChoice): Rounding =>
  asked.discount > 0 ? asked.rounding : DEFAULT_ROUNDING;

/**
 * One package's offer. A custom amount replaces the total, so while it is on the rounding choice
 * has nothing left to round (`rounds`).
 */
export function useOneOffer(asked: QuoteChoice, shown: boolean) {
  const query = useQuery({ ...quoteQuery(asked, roundingOf(asked)), enabled: shown });
  const custom = useQuoteCustom(query.data);
  return {
    query,
    text: query.data ? offerText(query.data, ar.pricing, custom.total) : null,
    custom: custom.price,
    invalid: !custom.valid,
    rounds: !custom.price.on,
  };
}

/** The whole price list: every price of the chosen country, students and discount. */
export function useListOffer(asked: QuoteChoice, shown: boolean) {
  const { country, students, discount } = asked;
  const query = useQuery({
    ...priceListQueryOptions(
      { apiFetch },
      { country, students, discount, rounding: roundingOf(asked) },
    ),
    // The last list keeps showing while the next one loads; `isPlaceholderData` blocks sending it.
    placeholderData: keepPreviousData,
    enabled: shown,
  });
  return {
    query,
    text: query.data ? priceListText(query.data, ar.pricing) : null,
    // The list has no custom amount: one left invalid on the single offer does not hold it.
    invalid: false,
    rounds: true,
  };
}
