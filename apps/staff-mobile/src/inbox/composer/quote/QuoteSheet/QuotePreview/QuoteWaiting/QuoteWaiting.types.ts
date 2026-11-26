import type { QuoteOffer } from '@/inbox/composer/quote/use-quote-sheet.types';

export interface QuoteWaitingProps {
  offer: Pick<QuoteOffer, 'failed' | 'retry'>;
}
