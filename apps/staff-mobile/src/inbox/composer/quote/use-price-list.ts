import { priceListQueryOptions, type PriceListChoice } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * GET /pricing/list for the sheet's choice, asked only while the sheet shows the whole list. The
 * last list stays while the next one loads; `isPlaceholderData` tells the sheet not to send it.
 */
export function usePriceList(choice: PriceListChoice, enabled: boolean) {
  return useQuery({
    ...priceListQueryOptions({ apiFetch, apiSend }, choice),
    placeholderData: keepPreviousData,
    enabled,
  });
}
