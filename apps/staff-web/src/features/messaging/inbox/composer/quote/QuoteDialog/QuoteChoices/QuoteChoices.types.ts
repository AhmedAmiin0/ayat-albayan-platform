import type { CustomPrice } from '@/features/finance/subscriptions';
import type {
  QuoteChoice,
  QuoteMode,
} from '@/features/messaging/inbox/composer/quote/use-quote-offer.types';

export interface QuoteChoicesProps {
  /** The chat's number, for the line saying which country it is from. */
  phone: string;
  mode: QuoteMode;
  onMode: (mode: QuoteMode) => void;
  choice: QuoteChoice;
  onChange: (patch: Partial<QuoteChoice>) => void;
  /** There is a discount to round and no custom amount in its place. */
  rounds: boolean;
  /** The custom amount, offered on one package only. */
  custom: CustomPrice;
}
