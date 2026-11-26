import type { useQuoteSheet } from '@/inbox/composer/quote/use-quote-sheet';

export interface QuoteChoicesProps {
  /** The chat's number: the line above the steps says where it is from. */
  phone: string;
  /** The sheet's choices and their setters; the text they price is the preview's. */
  sheet: Omit<ReturnType<typeof useQuoteSheet>, 'offer'>;
}
