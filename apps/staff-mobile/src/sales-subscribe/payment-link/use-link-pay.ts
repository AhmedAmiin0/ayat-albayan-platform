import type {
  PaymentLinkCreate,
  PaymentLinkQuoteView,
  PaymentLinkView,
  SubscriptionPricing,
} from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { refreshFamily } from '@/sales-subscribe/lib/family';
import { useCreateLink, useLinkQuote } from './link-api';
import { checkAmount } from './link-text';

/** What the subscribe form adds: the start day, the used lessons, the teacher (API: the kind). */
type LinkExtra = Omit<
  PaymentLinkCreate,
  'studentId' | 'pricing' | 'amount' | 'currency' | 'clientRequestId' | 'kind'
>;

interface LinkPayInput {
  /** Empty while online payment is not picked: nothing is fetched. */
  studentId: string;
  pricing: SubscriptionPricing;
  /** The chat: its family refetches once the link (and its unpaid package) exists. */
  phone: string;
}

/** The amount checked against the quote's price and the admin's cap; none before a price. */
const checkOf = (text: string, priced: PaymentLinkQuoteView | undefined) =>
  priced &&
  checkAmount(text, { reference: priced.quote.afterDiscount, maxDiscountPct: priced.max_discount_pct });

/** Online payment (docs/30): a custom amount must be > 0 and not below the admin's minimum. */
export function useLinkPay({ studentId, pricing, phone }: LinkPayInput) {
  const client = useQueryClient();
  const key = `${studentId}|${JSON.stringify(pricing)}`;
  const [typed, setTyped] = useState<{ key: string; text: string } | null>(null);
  const [custom, setCustomOn] = useState(false);
  const [tried, setTried] = useState(false);
  const [link, setLink] = useState<PaymentLinkView | null>(null);
  const quote = useLinkQuote(studentId, pricing);
  const priced = quote.isSuccess && !quote.isPlaceholderData ? quote.data : undefined;
  const reference = priced ? String(priced.quote.afterDiscount) : '';
  // With a custom amount off, always the calculator price; a typed amount counts only when on.
  const amountText = custom && typed?.key === key ? typed.text : reference;
  const check = checkOf(amountText, priced);
  const create = useCreateLink();
  const submit = (extra: LinkExtra) => {
    setTried(true);
    if (!priced || !check?.ok) return;
    const currency = priced.quote.currency;
    const body = { studentId, pricing, amount: check.amount, currency, ...extra };
    create.mutate(body, {
      onSuccess: (made) => {
        setLink(made);
        refreshFamily(client, phone);
      },
    });
  };
  return {
    quote,
    priced,
    amountText,
    custom,
    setAmount: (text: string) => setTyped({ key, text }),
    /** On or off, the amount starts again from the calculator price. */
    setCustom: (on: boolean) => {
      setCustomOn(on);
      setTyped(null);
    },
    amountError: tried && check?.ok === false ? check.error : undefined,
    create,
    submit,
    link,
  };
}

export type LinkPay = ReturnType<typeof useLinkPay>;
