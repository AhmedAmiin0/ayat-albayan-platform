import {
  linkAmountProblem,
  type PaymentLinkCreate,
  type PaymentLinkQuoteView,
  type PaymentLinkView,
  type SubscriptionPricing,
} from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useDebounced } from '@/features/finance/pricing';
import {
  createPaymentLink,
  PAYMENT_LINKS_KEY,
  quotePaymentLink,
} from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';

/** What the subscribe step adds: the start day, the used lessons, the teacher (API: the kind). */
type LinkExtra = Omit<
  PaymentLinkCreate,
  'studentId' | 'pricing' | 'amount' | 'currency' | 'clientRequestId' | 'kind'
>;

type Opts = {
  /** '' while «دفع إلكتروني» is not picked: nothing is asked. */
  studentId: string;
  /** One object per form (the step keeps it): the debounce settles on this very object. */
  pricing: SubscriptionPricing;
  onCreated: (link: PaymentLinkView) => Promise<void>;
};

const positive = (text: string, amount: number) =>
  text.trim() !== '' && Number.isFinite(amount) && amount > 0;

/** The amount's problem, as text: > 0, and not below the admin's cap (linkAmountProblem). */
function amountProblem(text: string, q: PaymentLinkQuoteView): string | null {
  const amount = Number(text);
  if (!positive(text, amount)) return t.paymentLinks.web.amountPositive;
  const reference = q.quote.afterDiscount;
  const problem = linkAmountProblem({ amount, reference, maxDiscountPct: q.max_discount_pct });
  return problem ? t.paymentLinks.error[problem] : null;
}

/**
 * «دفع إلكتروني» inside «اشتراك جديد» (owner 2026-10-29, docs/30, FEATURE_STRIPE test or live):
 * POST /sales/payment-links/quote (debounced) for the reference, the amount (the calculator price
 * after the pill; with «مبلغ مخصص» on (owner 2026-11-01) the one she types; a new package or
 * child resets it), then the link with the step's own fields. One clientRequestId per form. The
 * API makes the unpaid package with the link (never POST /sales/subscriptions too).
 */
export function useLinkPay({ studentId, pricing, onCreated }: Opts) {
  const queryClient = useQueryClient();
  const [typed, setTyped] = useState<{ key: string; text: string } | null>(null);
  const [custom, setCustomOn] = useState(false);
  const [tried, setTried] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const settled = useDebounced(pricing, 300);
  const quote = useQuery({
    queryKey: [...PAYMENT_LINKS_KEY, 'quote', studentId, settled],
    queryFn: () => quotePaymentLink({ studentId, pricing: settled }),
    enabled: !!studentId,
  });
  const create = useMutation({
    mutationFn: createPaymentLink,
    onSuccess: async (link) => {
      await queryClient.invalidateQueries({ queryKey: PAYMENT_LINKS_KEY });
      await onCreated(link);
    },
  });
  const key = `${studentId}|${JSON.stringify(pricing)}`;
  const q = quote.data;
  const reference = q ? String(q.quote.afterDiscount) : '';
  // «مبلغ مخصص» off: always the calculator price after the pill; a typed one counts only when on.
  const amount = custom && typed?.key === key ? typed.text : reference;
  const problem = q ? amountProblem(amount, q) : null;
  const ready = !!q && settled === pricing && !quote.isFetching && !create.isPending;
  return {
    quote,
    amount,
    amountError: tried ? problem : null,
    ready,
    create,
    custom,
    setAmount: (text: string) => setTyped({ key, text }),
    /** On or off, the amount starts again from the calculator price. */
    setCustom: (on: boolean) => {
      setCustomOn(on);
      setTyped(null);
    },
    submit: (extra: LinkExtra) => {
      setTried(true);
      if (!q || !ready || problem) return;
      const currency = q.quote.currency;
      const body = { studentId, pricing: settled, amount: Number(amount), currency };
      create.mutate({ ...body, clientRequestId: requestId, ...extra });
    },
  };
}

export type LinkPay = ReturnType<typeof useLinkPay>;
