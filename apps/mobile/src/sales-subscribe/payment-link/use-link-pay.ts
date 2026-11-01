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
  /** '' while «دفع إلكتروني» is not picked: nothing is asked. */
  studentId: string;
  pricing: SubscriptionPricing;
  /** The chat: its family refetches once the link (and its unpaid package) exists. */
  phone: string;
}

/** The amount checked against the quote's price and the admin's cap; none before a price. */
const checkOf = (text: string, priced: PaymentLinkQuoteView | undefined) =>
  priced &&
  checkAmount(text, { reference: priced.quote.afterDiscount, maxDiscountPct: priced.max_discount_pct });

/**
 * «دفع إلكتروني» inside «اشتراك جديد» (owner 2026-10-29, docs/30, FEATURE_STRIPE test or live):
 * the calculator price as the reference (POST /sales/payment-links/quote), the amount (that price
 * after the pill; with «مبلغ مخصص» on (owner 2026-11-01) the one she types: a new package or child
 * resets it; > 0, not below the admin's minimum), then POST /sales/payment-links with the form's
 * own student, package, start day and teacher. The API makes the unpaid package with the link.
 */
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
  // «مبلغ مخصص» off: always the calculator price after the pill; a typed one counts only when on.
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
