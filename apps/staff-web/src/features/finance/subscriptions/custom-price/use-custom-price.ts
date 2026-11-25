import type { QuotedPrice } from '@ab/client-core';
import { parseAmount } from '@ab/money';
import { useState } from 'react';
import { t } from '@ab/web-kit';

/** Off sends the default body. */
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

/** Off uses the quote; on sends the typed `customPrice`, restarted by a new quote. */
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
