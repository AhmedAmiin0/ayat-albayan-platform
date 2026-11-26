import { askedRounding, priceListQueryOptions } from '@ab/client-core';
import { offerText, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { apiFetch } from '@ab/web-kit';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { quoteQuery } from '@/features/finance/pricing';
import { useQuoteCustom } from './use-quote-custom';
import type { QuoteChoice } from './use-quote-offer.types';

// Both texts are Arabic whatever the UI language: they are the client's message.

/** One package's offer; a custom amount replaces its total. */
export function useOneOffer(asked: QuoteChoice, shown: boolean) {
  const rounding = askedRounding(asked.discount, asked.rounding);
  const query = useQuery({ ...quoteQuery(asked, rounding), enabled: shown });
  const custom = useQuoteCustom(query.data);
  return {
    query,
    text: query.data ? offerText(query.data, ar.pricing, custom.total) : null,
    custom: custom.price,
    invalid: !custom.valid,
  };
}

/** The whole price list: every price of the chosen country, students and discount. */
export function useListOffer(asked: QuoteChoice, shown: boolean) {
  const { country, students, discount } = asked;
  const rounding = askedRounding(discount, asked.rounding);
  const query = useQuery({
    ...priceListQueryOptions({ apiFetch }, { country, students, discount, rounding }),
    // The last list keeps showing while the next one loads; `isPlaceholderData` blocks sending it.
    placeholderData: keepPreviousData,
    enabled: shown,
  });
  return {
    query,
    text: query.data ? priceListText(query.data, ar.pricing) : null,
    // The list has no custom amount: one left invalid on the single offer does not hold it.
    invalid: false,
  };
}
