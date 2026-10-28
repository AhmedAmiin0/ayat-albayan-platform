import { linkAmountProblem, type PaymentLinkKind, type PaymentLinkQuoteView, type PaymentLinkView, type SalesFamilyStudent } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useDebounced } from '@/features/finance/pricing';
import { INITIAL_PRICING, pricingBody, type PricingForm } from '@/features/finance/subscriptions';
import { createPaymentLink, PAYMENT_LINKS_KEY, quotePaymentLink } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';

type Opts = { students: SalesFamilyStudent[]; onCreated: (link: PaymentLinkView) => void };

/** The agreed amount's problem, as text: > 0, and not below the admin's cap (linkAmountProblem). */
function amountProblem(text: string, q: PaymentLinkQuoteView): string | null {
  const amount = Number(text);
  if (!text.trim() || !Number.isFinite(amount) || amount <= 0) return t.paymentLinks.web.amountPositive;
  const problem = linkAmountProblem({ amount, reference: q.quote.afterDiscount, maxDiscountPct: q.max_discount_pct });
  return problem ? t.paymentLinks.error[problem] : null;
}

/** The only student, else the only one due for a renewal, else none picked. */
const firstPick = (students: SalesFamilyStudent[]): string => {
  const due = students.filter((s) => s.renew_due);
  return (students.length === 1 ? students[0]?.id : due.length === 1 ? due[0]?.id : undefined) ?? '';
};

/**
 * «رابط دفع»'s inputs (docs/30): new or renewal (a renewal opens on the student's `renewal` pricing, like
 * «جدّد الاشتراك»), the calculator's inputs, POST /sales/payment-links/quote (debounced) and the agreed
 * amount, which follows the calculator price until she types one. One clientRequestId per form.
 */
export function useLinkForm({ students, onCreated }: Opts) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<PaymentLinkKind>(() => (students.some((s) => s.renew_due) ? 'renewal' : 'new'));
  const [studentId, setStudentId] = useState(() => firstPick(students));
  const seed = (k: PaymentLinkKind, id: string): PricingForm => (k === 'renewal' ? students.find((s) => s.id === id)?.renewal : undefined) ?? INITIAL_PRICING;
  const [form, setForm] = useState<PricingForm>(() => seed(kind, studentId));
  const [typed, setTyped] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const pricing = useMemo(() => pricingBody(form), [form]);
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
      onCreated(link);
    },
  });
  const reseed = (k: PaymentLinkKind, id: string) => {
    setForm(seed(k, id));
    setTyped(null);
  };
  const q = quote.data;
  const amount = typed ?? (q ? String(q.quote.afterDiscount) : '');
  const problem = q ? amountProblem(amount, q) : null;
  const ready = !!q && settled === pricing && !quote.isFetching && !create.isPending;
  return {
    kind,
    studentId,
    form,
    quote,
    amount,
    amountError: tried ? problem : null,
    ready,
    create,
    setKind: (k: PaymentLinkKind) => {
      setKind(k);
      reseed(k, studentId);
    },
    pick: (id: string) => {
      setStudentId(id);
      reseed(kind, id);
    },
    setPricing: (patch: Partial<PricingForm>) => {
      setForm((f) => ({ ...f, ...patch }));
      setTyped(null);
    },
    setAmount: setTyped,
    submit: () => {
      setTried(true);
      if (!q || !ready || problem) return;
      create.mutate({ studentId, kind, pricing: settled, amount: Number(amount), currency: q.quote.currency, clientRequestId: requestId });
    },
  };
}

export type LinkFormState = ReturnType<typeof useLinkForm>;
