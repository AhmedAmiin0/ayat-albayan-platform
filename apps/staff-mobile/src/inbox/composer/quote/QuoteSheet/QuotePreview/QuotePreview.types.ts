import type { QuoteOffer } from '@/inbox/composer/quote/use-quote-sheet.types';

export interface QuotePreviewProps {
  /** The text of the mode on screen: one package's offer or the whole price list. */
  offer: QuoteOffer;
}
