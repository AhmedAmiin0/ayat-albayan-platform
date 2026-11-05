import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { checkCustomPrice, type QuotedPrice } from './custom-price';

/**
 * «مبلغ مخصص» on the package price (owner 2026-11-02), admin and assistant alike. On, the field
 * starts from the quote's price (a new quote starts it again); off drops what was typed and the
 * save sends exactly today's body. `body` is spread into POST /subscriptions or
 * /sales/subscriptions.
 */
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
