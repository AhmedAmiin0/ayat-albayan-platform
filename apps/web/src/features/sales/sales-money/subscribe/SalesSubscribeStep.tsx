import { chatBinding, DISCOUNTS, usedBeforeMax, type PaymentLinkView, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { INITIAL_PRICING, pricingBody, todayIn, type PricingForm } from '@/features/finance/subscriptions/create/pricing-form';
import { pricingLessons } from '@/features/finance/subscriptions';
import { PricingFields } from '@/features/finance/subscriptions/create/PricingFields';
import { useStripeFeature } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { createSalesSubscription, refreshAfterSalesWrite } from '@/features/sales/sales-money/api';
import { ChildPicker } from './ChildPicker';
import { linkStepErrorText, salesErrorText } from '@/features/sales/sales-money/errors';
import { CustomAmountToggle } from '@/features/sales/sales-money/payment-link/CustomAmountToggle';
import { OnlinePayFields } from '@/features/sales/sales-money/payment-link/OnlinePayFields';
import { useLinkPay } from '@/features/sales/sales-money/payment-link/use-link-pay';
import { SalesQuotePreview } from './SalesQuotePreview';
import { SalesStartField, type StartValue } from './SalesStartField';
import { SalesTeacherField, useTeacherPick } from './SalesTeacherField';
import { startBody } from './start-body';

type Props = {
  students: SalesFamilyStudent[];
  /** The chat's phone: sent only for a child not hers (chatBinding, sales.renew_any, docs/16 row 38). */
  phone?: string | undefined;
  /** The student already picked (a renewal); else the only one, or none. */
  picked?: string | undefined;
  /** «جدّد الاشتراك»: only her students due for a renewal, the calculator prefilled from the picked one's. */
  renew?: boolean | undefined;
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
  /** «دفع إلكتروني»: the link made (its unpaid package with it), to send in the chat. */
  onLinked: (link: PaymentLinkView) => void;
};

type Method = 'bank' | 'online';
const METHODS: { value: Method; label: string }[] = [
  { value: 'bank', label: t.enums.paymentMethod.bank },
  { value: 'online', label: t.salesMoney.payOnline },
];

/**
 * Step 1 «اشتراك جديد» (R-ASST-01): one of her students, the calculator's inputs, the API's quote and the
 * first day (only with subscriptions.set_start_date, else the API's default) → POST /sales/subscriptions.
 * One clientRequestId per body: a retry gets the first package back. A renewal (owner 2026-10-26) opens on
 * the student's last package (GET /sales/money/family `renewal`, the admin's renewalPricing); she may change
 * anything; the first day is the same default as any package (today, Riyadh), like the admin's renewal.
 * «المعلم/ة» (owner 2026-10-29): the student's teacher (the trial's) unless she picks another; sent as teacherId.
 * «طريقة الدفع» (owner 2026-10-29) only where both exist (a Stripe build with the API's switch on, her own
 * child): «تحويل بنكي» saves the package as above, «دفع إلكتروني» makes a payment link from the same fields.
 */
export function SalesSubscribeStep({ students, phone = '', picked, renew = false, onClose, onSaved, onLinked }: Props) {
  const queryClient = useQueryClient();
  const formId = useId();
  const choices = renew ? students.filter((s) => s.renew_due || s.id === picked) : students;
  const seedOf = (id: string): PricingForm => (renew ? students.find((s) => s.id === id)?.renewal : undefined) ?? INITIAL_PRICING;
  const [studentId, setStudentId] = useState(() => picked ?? (choices.length === 1 ? (choices[0]?.id ?? '') : ''));
  const [form, setForm] = useState<PricingForm>(() => seedOf(studentId));
  const teacher = useTeacherPick(students, studentId);
  const pick = (id: string) => {
    setStudentId(id);
    if (renew) setForm(seedOf(id));
  };
  const canSet = usePermissions().can('subscriptions.set_start_date');
  // academy day (docs/34 b): the API checks starts_on / used-before against the Riyadh day
  const [today] = useState(() => todayIn('Asia/Riyadh'));
  const [start, setStart] = useState<StartValue>({ startsOn: today, alreadyStarted: false, usedBefore: 0 });
  const [startError, setStartError] = useState<string | null>(null);
  // One object per form (useLinkPay's debounce settles on it): kept in state, not useMemo.
  const [priced, setPriced] = useState(() => ({ form, pricing: pricingBody(form) }));
  if (priced.form !== form) setPriced({ form, pricing: pricingBody(form) });
  const pricing = priced.form === form ? priced.pricing : pricingBody(form);
  const child = students.find((s) => s.id === studentId);
  const stripe = useStripeFeature();
  const canOnline = stripe && child !== undefined && child.mine !== false;
  const [method, setMethod] = useState<Method>('bank');
  const online = canOnline && method === 'online';
  const linked = async (link: PaymentLinkView) => {
    await refreshAfterSalesWrite(queryClient);
    onLinked(link);
  };
  const pay = useLinkPay({ studentId: online ? studentId : '', pricing, onCreated: linked });
  const bind = chatBinding(students, { studentId, phone });
  // A smaller package clamps «حلقات مستخدمة من الباقة» to one lesson left per course day.
  const lessonsTotal = pricingLessons(pricing);
  const usedMax = usedBeforeMax(lessonsTotal);
  const startShown = { ...start, usedBefore: Math.min(start.usedBefore, usedMax) };
  const request = useRef<{ body: string; id: string } | null>(null);

  const save = useMutation({
    mutationFn: createSalesSubscription,
    onSuccess: async (sub) => {
      await refreshAfterSalesWrite(queryClient);
      onSaved(sub);
    },
  });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!studentId || save.isPending) return;
    const checked = startBody(startShown, { canSet, today, lessonsTotal });
    setStartError(checked.ok ? null : t.salesMoney.error[checked.code]);
    if (!checked.ok) return;
    // The link never carries the chat's phone: online is for her own children only.
    if (online) return pay.submit({ ...checked.body, ...teacher.body });
    const body = { studentId, pricing, ...checked.body, ...teacher.body, ...bind };
    const key = JSON.stringify(body);
    if (request.current?.body !== key) request.current = { body: key, id: crypto.randomUUID() };
    save.mutate({ ...body, clientRequestId: request.current.id });
  };
  const bankLabel = save.isPending ? t.salesMoney.saving : t.salesMoney.saveSubscription;
  const onlineLabel = pay.create.isPending ? t.paymentLinks.creating : t.paymentLinks.create;

  return (
    <Dialog
      title={renew ? t.students.renew : t.salesMoney.newSubscription}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!studentId || (online ? !pay.ready : save.isPending)}>
            {online ? onlineLabel : bankLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <ChildPicker students={choices} value={studentId} onChange={pick} />
        <PricingFields
          form={form}
          discounts={DISCOUNTS}
          set={(patch) => setForm((f) => ({ ...f, ...patch }))}
          discountExtra={online ? <CustomAmountToggle pay={pay} /> : undefined}
        />
        {canOnline && <SegmentedControl label={t.payments.method} options={METHODS} value={method} onChange={setMethod} />}
        {studentId && (online ? <OnlinePayFields pay={pay} /> : <SalesQuotePreview studentId={studentId} pricing={pricing} bind={bind} />)}
        {studentId && <SalesTeacherField value={teacher.teacherId} onChange={teacher.setTeacher} />}
        <SalesStartField canSet={canSet} today={today} value={startShown} usedMax={usedMax} onChange={(patch) => setStart((v) => ({ ...v, ...patch }))} error={startError} />
        {!online && save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
        {online && pay.create.isError && <FormAlert>{linkStepErrorText(pay.create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
