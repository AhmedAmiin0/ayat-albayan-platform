import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import type { QuotedPrice } from '@ab/client-core';
import { checkCustomPrice } from './custom-price';

/** Off drops the typed price and the save sends the default body; a new quote restarts it. */
export function useCustomPrice(quote: QuotedPrice | undefined) {
  const [on, setOnState] = useState(false);
  const [typed, setTyped] = useState<{ from: string; text: string } | null>(null);
  const from = quote ? String(quote.afterDiscount) : '';
  const text = typed?.from === from ? typed.text : from;
  const check = checkCustomPrice(on, text);
  return {
    on,
    text,
    quote,
    setOn: (next: boolean) => {
      setOnState(next);
      setTyped(null);
    },
    setText: (next: string) => setTyped({ from, text: next }),
    error: check.ok ? undefined : t.subscriptions.customPrice.invalid,
    ok: check.ok,
    body: check.ok ? check.body : {},
  };
}

export type CustomPrice = ReturnType<typeof useCustomPrice>;
