import { chatBinding, DISCOUNTS, usedBeforeMax, type PaymentLinkView, type SalesFamilyStudent, type SalesMoneySubscriptionView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { INITIAL_PRICING, todayIn, type PricingForm } from '@/features/finance/subscriptions/create/pricing-form';
import { CustomPriceField, pricingLessons, usePricingBody } from '@/features/finance/subscriptions';
import { PricingFields } from '@/features/finance/subscriptions/create/PricingFields';
import { useStripeFeature } from '@/features/sales/payment-links';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { createSalesSubscription, refreshAfterSalesWrite } from '@/features/sales/sales-money/api';
import { ChildPicker } from './ChildPicker';
import { linkStepErrorText, salesErrorText } from '@/features/sales/sales-money/errors';
import { CustomAmountToggle, useBodyRequestId } from '@/features/finance/subscriptions';
import { OnlinePayFields } from '@/features/sales/sales-money/payment-link/OnlinePayFields';
import { useLinkPay } from '@/features/sales/sales-money/payment-link/use-link-pay';
import { SalesQuotePreview } from './SalesQuotePreview';
import { SalesStartField, type StartValue } from './SalesStartField';
import { SalesTeacherField, useTeacherPick } from './SalesTeacherField';
import { startBody } from './start-body';
import { useSalesCustomPrice } from './use-sales-quote';

type Props = {
  students: SalesFamilyStudent[];
  /** The chat's phone: sent only for a child not hers (chatBinding, sales.renew_any, docs/16 row 38). */
  phone?: string | undefined;
  /** The student already picked (a renewal); else the only one, or none. */
  picked?: string | undefined;
  /** Only her students due for a renewal, the calculator prefilled from the picked one's. */
  renew?: boolean | undefined;
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
  /** The link made, with its unpaid package, to send in the chat. */
  onLinked: (link: PaymentLinkView) => void;
};

type Method = 'bank' | 'online';
const METHODS: { value: Method; label: string }[] = [
  { value: 'bank', label: t.enums.paymentMethod.bank },
  { value: 'online', label: t.salesMoney.payOnline },
];

/** One clientRequestId per body so a retry gets the first package back (R-ASST-01). */
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
  const pricing = usePricingBody(form);
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
  const price = useSalesCustomPrice({ studentId: online ? '' : studentId, pricing, bind });
  // A smaller package clamps the used lessons to every lesson but one.
  const lessonsTotal = pricingLessons(pricing);
  const usedMax = usedBeforeMax(lessonsTotal);
  const startShown = { ...start, usedBefore: Math.min(start.usedBefore, usedMax) };
  const requestId = useBodyRequestId();

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
    const custom = price.check();
    if (!checked.ok || !custom) return;
    // The link never carries the chat's phone: online is for her own children only.
    if (online) return pay.submit({ ...checked.body, ...teacher.body });
    const body = { studentId, pricing, ...custom, ...checked.body, ...teacher.body, ...bind };
    save.mutate({ ...body, clientRequestId: requestId(body) });
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
          discountExtra={<CustomAmountToggle {...(online ? pay.toggle : price.toggle)} />}
        />
        {canOnline && <SegmentedControl label={t.payments.method} options={METHODS} value={method} onChange={setMethod} />}
        {studentId && (online ? <OnlinePayFields pay={pay} /> : <SalesQuotePreview studentId={studentId} pricing={pricing} bind={bind} />)}
        <CustomPriceField price={price} />
        {studentId && <SalesTeacherField value={teacher.teacherId} onChange={teacher.setTeacher} />}
        <SalesStartField canSet={canSet} today={today} value={startShown} usedMax={usedMax} onChange={(patch) => setStart((v) => ({ ...v, ...patch }))} error={startError} />
        {!online && save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
        {online && pay.create.isError && <FormAlert>{linkStepErrorText(pay.create.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
