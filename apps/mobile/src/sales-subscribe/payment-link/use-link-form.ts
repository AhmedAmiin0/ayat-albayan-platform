import type { PaymentLinkKind, PaymentLinkQuoteView, PaymentLinkView, SalesFamilyStudent } from '@ab/shared';
import { useState } from 'react';
import { INITIAL_FORM, pricingOf, renewalForm } from '@/subscribe';
import { useCreateLink, useLinkQuote } from './link-api';
import { checkAmount } from './link-text';

type Form = typeof INITIAL_FORM;

/** A renewal starts from the child's last package (as «جدّد الاشتراك»); a new one from the empty calculator. */
const seedOf = (kind: PaymentLinkKind, student: SalesFamilyStudent | undefined): Form =>
  kind === 'renewal' && student ? renewalForm(student.renewal) : INITIAL_FORM;

/** The only child of hers is picked, as a renewal when she is due for one. */
function firstPick(students: readonly SalesFamilyStudent[]): { studentId: string; kind: PaymentLinkKind } {
  const only = students.length === 1 ? students[0] : undefined;
  return { studentId: only?.id ?? '', kind: only?.renew_due ? 'renewal' : 'new' };
}

/** The agreed amount: what she typed, else the reference; its check once priced. */
function agreed(priced: PaymentLinkQuoteView | undefined, typed: string | null) {
  if (!priced) return { text: typed ?? '', check: undefined };
  const text = typed ?? String(priced.quote.afterDiscount);
  return { text, check: checkAmount(text, { reference: priced.quote.afterDiscount, maxDiscountPct: priced.max_discount_pct }) };
}

/**
 * The «رابط دفع» form (docs/30): the child (the only one of hers is picked), new / renewal (renewal first
 * when that child is due), the calculator inputs, the API's reference price and the agreed amount, which
 * follows the reference until she types one (a new package or child resets it).
 */
export function useLinkForm(students: readonly SalesFamilyStudent[]) {
  const [first] = useState(() => firstPick(students));
  const [studentId, setStudentId] = useState(first.studentId);
  const [kind, setKindState] = useState(first.kind);
  const [form, setFormState] = useState(() => seedOf(first.kind, students[0]));
  const [typed, setTyped] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [link, setLink] = useState<PaymentLinkView | null>(null);
  const reseed = (k: PaymentLinkKind, id: string) => {
    setFormState(seedOf(k, students.find((s) => s.id === id)));
    setTyped(null);
  };
  const pricing = pricingOf(form);
  const quote = useLinkQuote(studentId, pricing);
  const priced = quote.isSuccess && !quote.isPlaceholderData ? quote.data : undefined;
  const { text: amountText, check } = agreed(priced, typed);
  const create = useCreateLink();
  const submit = () => {
    setTried(true);
    if (!priced || !check?.ok) return;
    const body = { studentId, kind, pricing, amount: check.amount, currency: priced.quote.currency };
    create.mutate(body, { onSuccess: setLink });
  };
  return {
    studentId,
    pick: (id: string) => {
      setStudentId(id);
      reseed(kind, id);
    },
    kind,
    setKind: (k: PaymentLinkKind) => {
      setKindState(k);
      reseed(k, studentId);
    },
    form,
    patchForm: (patch: Partial<Form>) => {
      setFormState((f) => ({ ...f, ...patch }));
      setTyped(null);
    },
    quote,
    priced,
    amountText,
    setAmount: setTyped,
    amountError: tried && check?.ok === false ? check.error : undefined,
    create,
    submit,
    link,
  };
}
