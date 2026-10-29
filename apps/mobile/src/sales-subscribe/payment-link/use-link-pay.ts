import type { PaymentLinkCreate, PaymentLinkView, SubscriptionPricing } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { refreshFamily } from '../lib/family';
import { useCreateLink, useLinkQuote } from './link-api';
import { checkAmount } from './link-text';

/** What the subscribe form adds: the kind (from renew_due), the start day, the used lessons, the teacher. */
type LinkExtra = Omit<PaymentLinkCreate, 'studentId' | 'pricing' | 'amount' | 'currency' | 'clientRequestId'>;

interface LinkPayInput {
  /** '' while «دفع إلكتروني» is not picked: nothing is asked. */
  studentId: string;
  pricing: SubscriptionPricing;
  /** The chat: its family refetches once the link (and its unpaid package) exists. */
  phone: string;
}

/**
 * «دفع إلكتروني» inside «اشتراك جديد» (owner 2026-10-29, docs/30, test build only): the calculator price as
 * the reference (POST /sales/payment-links/quote), the agreed amount (the reference until she types one; a
 * new package or child resets it; > 0, not below the admin's minimum), then POST /sales/payment-links with
 * the form's own student, package, start day and teacher. The API makes the unpaid package with the link.
 */
export function useLinkPay({ studentId, pricing, phone }: LinkPayInput) {
  const client = useQueryClient();
  const key = `${studentId}|${JSON.stringify(pricing)}`;
  const [typed, setTyped] = useState<{ key: string; text: string } | null>(null);
  const [tried, setTried] = useState(false);
  const [link, setLink] = useState<PaymentLinkView | null>(null);
  const quote = useLinkQuote(studentId, pricing);
  const priced = quote.isSuccess && !quote.isPlaceholderData ? quote.data : undefined;
  const reference = priced ? String(priced.quote.afterDiscount) : '';
  const amountText = typed?.key === key ? typed.text : reference;
  const check = priced ? checkAmount(amountText, { reference: priced.quote.afterDiscount, maxDiscountPct: priced.max_discount_pct }) : undefined;
  const create = useCreateLink();
  const submit = (extra: LinkExtra) => {
    setTried(true);
    if (!priced || !check?.ok) return;
    const body = { studentId, pricing, amount: check.amount, currency: priced.quote.currency, ...extra };
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
    setAmount: (text: string) => setTyped({ key, text }),
    amountError: tried && check?.ok === false ? check.error : undefined,
    create,
    submit,
    link,
  };
}

export type LinkPay = ReturnType<typeof useLinkPay>;
