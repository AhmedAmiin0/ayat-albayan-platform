/** One package's offer, or the whole price list of the client's country in one message. */
export type QuoteMode = 'one' | 'all';

/** What the sheet may send: the text of the mode on screen, whichever query priced it. */
export interface QuoteOffer {
  /** The message as the client would read it; null until a price has come or after it failed. */
  text: string | null;
  /** The text is not the current choice's (or its custom amount is invalid): nothing may leave. */
  held: boolean;
  /** The price could not be loaded, or read again: there is nothing to show. */
  failed: boolean;
  retry: () => void;
}
