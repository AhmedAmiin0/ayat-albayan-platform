import { parseAmount } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';

/** The quote the price starts from: the admin's and the sales quote both carry these. */
export interface QuotedPrice { afterDiscount: number; currency: string }

/** The create body's extra: `customPrice` only with «مبلغ مخصص» on (off = today's body). */
export interface CustomPriceBody { customPrice?: number }

interface Typed { key: string; text: string }

interface Opts {
  quote: QuotedPrice | undefined;
  /** false while the form has no student (or pays online): never a field, never a key. */
  active: boolean;
}

const keyOf = (q: QuotedPrice | undefined): string => (q ? `${q.afterDiscount} ${q.currency}` : '');
const quotedText = (q: QuotedPrice | undefined): string => (q ? String(q.afterDiscount) : '');
const textOf = (typed: Typed | null, q: QuotedPrice | undefined): string =>
  typed?.key === keyOf(q) ? typed.text : quotedText(q);

/**
 * «مبلغ مخصص» on a package price (owner 2026-11-02): off = the quote's price, the body unchanged;
 * on = the amount typed (it starts from the quote, and a new quote starts it again), read with
 * parseAmount and sent as `customPrice`. Turning it off drops what was typed.
 */
export function useCustomPrice({ quote, active }: Opts) {
  const [on, setOn] = useState(false);
  const [typed, setTyped] = useState<Typed | null>(null);
  const [tried, setTried] = useState(false);
  const shown = active && on;
  const text = textOf(typed, quote);
  const value = parseAmount(text);
  const invalid = tried && value === null;
  return {
    on: shown,
    quote,
    text,
    error: invalid ? t.subscriptions.customPrice.invalid : null,
    toggle: {
      on,
      onChange: (next: boolean) => {
        setOn(next);
        setTyped(null);
        setTried(false);
      },
    },
    setText: (next: string) => setTyped({ key: keyOf(quote), text: next }),
    /** The body's extra, or null while the typed price is not an amount (its error shows). */
    check: (): CustomPriceBody | null => {
      if (!shown) return {};
      setTried(true);
      return value === null ? null : { customPrice: value };
    },
  };
}

export type CustomPrice = ReturnType<typeof useCustomPrice>;
