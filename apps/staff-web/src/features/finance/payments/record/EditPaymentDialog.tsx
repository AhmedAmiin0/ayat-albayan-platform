import { amountFromStripe, parseAmount } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { MONEY_KEY } from '@/features/finance/subscriptions';
import { apiErrorText, studentLabel } from '@/features/finance/subscriptions';
import { paidAtFor, updatePayment, type PaymentView } from '@/features/finance/payments/api';
import { paidAtDay } from './pay-day';
import { PaymentFields, type PaymentForm } from './PaymentFields';

/** Audited, and the package status follows; a card payment's amount is Stripe's and never sent. */
export function EditPaymentDialog({ payment, onClose }: { payment: PaymentView; onClose: () => void }) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PaymentForm>({
    amount: String(payment.amount),
    method: payment.method,
    day: paidAtDay(new Date(payment.paid_at)),
    note: payment.note ?? '',
  });
  const [amountError, setAmountError] = useState<string | null>(null);
  const locked = amountFromStripe(payment.method);
  const save = useMutation({
    mutationFn: (amount: number) =>
      updatePayment(payment.id, { ...(locked ? {} : { amount }), method: form.method, paidAt: paidAtFor(form.day), note: form.note.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
    },
  });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const amount = locked ? payment.amount : parseAmount(form.amount);
    setAmountError(amount === null ? (form.amount.trim() ? t.payments.mobile.amountInvalid : t.common.required) : null);
    if (amount !== null) save.mutate(amount);
  };
  return (
    <Dialog
      title={t.finance.editPayment}
      description={studentLabel(payment.student)}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {t.common.save}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <PaymentFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} currency={payment.currency} today={paidAtDay()} amountError={amountError} amountLocked={locked} />
        {save.isError && <FormAlert>{apiErrorText(save.error, { ...t.payments.error, ...t.finance.error })}</FormAlert>}
      </form>
    </Dialog>
  );
}
