import { sentRowOf } from '@ab/client-core';
import type { MessageView } from '@ab/shared';

// «أرسل العرض»'s clientRequestId per chat, kept outside the dialog (it unmounts on close): a retry
// after no answer, the dialog reopened or not, is never a second message (docs/44 BUG7). A new id
// once an offer went, or once a read shows the unconfirmed one went (a different later offer
// would else be answered with the first: lost). Forgotten on sign-out (tab-memory).

interface Unconfirmed {
  text: string;
  at: string;
  known: ReadonlySet<string>;
}

interface QuoteId {
  id: string;
  /** Set when its send ended with no answer: what was sent FIRST and the rows held then. */
  unconfirmed?: Unconfirmed;
}

const ids = new Map<string, QuoteId>();

/** The id the chat's next offer goes with. */
export function quoteIdOf(phone: string): QuoteId {
  const now = ids.get(phone) ?? { id: crypto.randomUUID() };
  ids.set(phone, now);
  return now;
}

/** The offer went (or was answered): the next one is a new send. */
export function quoteSent(phone: string): void {
  ids.delete(phone);
}

/** The offer's send ended with no answer: the first text and the rows then are kept for reads. */
export function quoteUnconfirmed(phone: string, sent: Unconfirmed): void {
  const now = quoteIdOf(phone);
  ids.set(phone, { ...now, unconfirmed: now.unconfirmed ?? sent });
}

/** A read shows the unconfirmed offer's row: its id is released. */
export function resolveQuote(phone: string, rows: readonly MessageView[]): void {
  const u = ids.get(phone)?.unconfirmed;
  const original = u && { body: u.text, template_key: null, created_at: u.at };
  if (original && sentRowOf(rows, original, u.known)) ids.delete(phone);
}

/** Sign-out. */
export function clearQuoteIds(): void {
  ids.clear();
}
