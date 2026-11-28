import type { PriceListPdfBodyInput } from '@ab/shared';
import { priceListParams } from './price-list.query-options';
import type { PriceListChoice } from './price-list.types';

/**
 * The body of POST /pricing/list-pdf: exactly the list query of the same choice, so the PDF
 * shows the prices the sheet shows, plus the chat file's request id.
 */
export function priceListPdfBody(
  choice: PriceListChoice,
  clientRequestId: string,
): PriceListPdfBodyInput {
  return { ...priceListParams(choice), clientRequestId };
}
