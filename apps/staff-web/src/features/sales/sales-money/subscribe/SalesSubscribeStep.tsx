import { chatBinding, type PaymentLinkView } from '@ab/shared';
import { DISCOUNTS } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, FormAlert, SegmentedControl, t } from '@ab/web-kit';
import {
  CustomAmountToggle,
  CustomPriceField,
  PricingFields,
  pricingLessons,
  useBodyRequestId,
  usePricingBody,
} from '@/features/finance/subscriptions';
import { useStripeFeature } from '@/features/sales/payment-links';
import { createSalesSubscription, refreshAfterSalesWrite } from '@/features/sales/sales-money/api';
import { ChildPicker } from './ChildPicker';
import { linkStepErrorText, salesErrorText } from '@/features/sales/sales-money/errors';
import { OnlinePayFields } from '@/features/sales/sales-money/payment-link/OnlinePayFields';
import { useLinkPay } from '@/features/sales/sales-money/payment-link/use-link-pay';
import { SalesQuotePreview } from './SalesQuotePreview';
import { SalesStartField } from './SalesStartField';
import { SalesTeacherField, useTeacherPick } from './SalesTeacherField';
import { startBody } from './start-body';
import { useSalesCustomPrice } from './use-sales-quote';
import type { PayMethod, SalesSubscribeStepProps } from './SalesSubscribeStep.types';
import { useStudentPick } from './use-student-pick';
import { useSubscribeStart } from './use-subscribe-start';

const METHODS: { value: PayMethod; label: string }[] = [
  { value: 'bank', label: t.enums.paymentMethod.bank },
  { value: 'online', label: t.salesMoney.payOnline },
];

/** One clientRequestId per body so a retry gets the first package back (R-ASST-01). */
export function SalesSubscribeStep(props: SalesSubscribeStepProps) {
  const { students, phone = '', picked, renew = false, onClose, onSaved, onLinked } = props;
  const queryClient = useQueryClient();
  const formId = useId();
  const { choices, studentId, form, setForm, pick } = useStudentPick({ students, picked, renew });
  const teacher = useTeacherPick(students, studentId);
  // One object per form (useLinkPay's debounce settles on it): kept in state, not useMemo.
  const pricing = usePricingBody(form);
  const child = students.find((s) => s.id === studentId);
  const stripe = useStripeFeature();
  const canOnline = stripe && child !== undefined && child.mine !== false;
  const [method, setMethod] = useState<PayMethod>('bank');
  const online = canOnline && method === 'online';
  const linked = async (link: PaymentLinkView) => {
    await refreshAfterSalesWrite(queryClient);
    onLinked(link);
  };
  const pay = useLinkPay({ studentId: online ? studentId : '', pricing, onCreated: linked });
  const bind = chatBinding(students, { studentId, phone });
  const price = useSalesCustomPrice({ studentId: online ? '' : studentId, pricing, bind });
  const lessonsTotal = pricingLessons(pricing);
  const {
    canSet,
    today,
    shown: startShown,
    usedMax,
    patch,
    error,
    setError,
  } = useSubscribeStart(lessonsTotal);
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
    setError(checked.ok ? null : t.salesMoney.error[checked.code]);
    const custom = price.check();
    if (!checked.ok || !custom) return;
    // The link never carries the chat's phone: online is for her own children only.
    if (online) {  pay.submit({ ...checked.body, ...teacher.body });; return; }
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
          <Button
            type="submit"
            form={formId}
            disabled={!studentId || (online ? !pay.ready : save.isPending)}
          >
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
        {canOnline && (
          <SegmentedControl
            label={t.payments.method}
            options={METHODS}
            value={method}
            onChange={setMethod}
          />
        )}
        {studentId &&
          (online ? (
            <OnlinePayFields pay={pay} />
          ) : (
            <SalesQuotePreview studentId={studentId} pricing={pricing} bind={bind} />
          ))}
        <CustomPriceField price={price} />
        {studentId && <SalesTeacherField value={teacher.teacherId} onChange={teacher.setTeacher} />}
        <SalesStartField
          canSet={canSet}
          today={today}
          value={startShown}
          usedMax={usedMax}
          onChange={patch}
          error={error}
        />
        {!online && save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
        {online && pay.create.isError && (
          <FormAlert>{linkStepErrorText(pay.create.error)}</FormAlert>
        )}
      </form>
    </Dialog>
  );
}
