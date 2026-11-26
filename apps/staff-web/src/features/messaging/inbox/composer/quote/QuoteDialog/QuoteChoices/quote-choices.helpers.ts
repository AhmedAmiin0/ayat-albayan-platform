import { ROUNDING_MODES } from '@ab/money';
import { t, type SegmentOption } from '@ab/web-kit';
import type { QuoteMode } from '@/features/messaging/inbox/composer/quote/use-quote-offer.types';

export const MODE_OPTIONS: SegmentOption<QuoteMode>[] = [
  { value: 'one', label: t.inbox.quote.mode.one },
  { value: 'all', label: t.inbox.quote.mode.all },
];
export const ROUNDING_OPTIONS = ROUNDING_MODES.map((mode) => ({
  value: mode,
  label: t.inbox.quote.rounding[mode],
}));
