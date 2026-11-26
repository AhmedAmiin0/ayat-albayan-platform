import type { OfferLabels } from '../offer-text';
import type { QuoteOptions } from '../quote';

/** What the staff member chooses for a list: no duration and no package, the list has them all. */
export type PriceListOptions = Pick<
  QuoteOptions,
  'country' | 'students' | 'discount' | 'rounding' | 'usdRate'
>;

type SharedWithOffer =
  | 'packages'
  | 'customSessions'
  | 'durations'
  | 'currencies'
  | 'perCircle'
  | 'studentsLabel'
  | 'trialNote';

/** ar.json `pricing`: the offer's own words plus the list's three lines. */
export interface PriceListLabels extends Pick<OfferLabels, SharedWithOffer> {
  listIntro: string;
  /** Carries `{pct}`, the percent as it was chosen. */
  listDiscount: string;
  /** Carries `{duration}`, a `durations` label. */
  listDuration: string;
}
