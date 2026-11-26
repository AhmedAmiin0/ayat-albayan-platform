/** `one`: one package's offer. `all`: the whole price list in one message. */
export type QuoteMode = 'one' | 'all';

/** What decides whether the chat's quote sheet offers the rounding choice. */
export interface RoundingFacts {
  /** The chosen discount, in percent. */
  discount: number;
  mode: QuoteMode;
  /** «مبلغ مخصص» is switched on; it belongs to the single offer only. */
  customOn: boolean;
}
