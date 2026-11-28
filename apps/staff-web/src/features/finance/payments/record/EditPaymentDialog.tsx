import { amountFromStripe } from '@ab/money';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiErrorText, studentLabel } from '@/features/finance/subscriptions';
import { paidAtFor, updatePayment, type PaymentView } from '@/features/finance/payments/api';
import { paidAtDay } from './pay-day';
import { PaymentFields, type PaymentForm } from './PaymentFields';

/**
 * Audited, and the package status follows. The amount is never sent from here: a card's is
 * Stripe's, any other changes only through «Edit amount», which asks first (UX-7, docs/65).
 */
export function EditPaymentDialog({ payment, onClose }: { payment: PaymentView; onClose: () => void }) {
  const formId = useId();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PaymentForm>({
    amount: String(payment.amount),
    method: payment.method,
    day: paidAtDay(new Date(payment.paid_at)),
    note: payment.note ?? '',
  });
  const amountHint = amountFromStripe(payment.method)
    ? t.payments.editAmount.fromStripe
    : t.payments.editAmount.elsewhere;
  const save = useMutation({
    mutationFn: () =>
      updatePayment(payment.id, { method: form.method, paidAt: paidAtFor(form.day), note: form.note.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
    },
  });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    save.mutate();
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
        <PaymentFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} currency={payment.currency} today={paidAtDay()} amountLockedReason={amountHint} />
        {save.isError && <FormAlert>{apiErrorText(save.error, { ...t.payments.error, ...t.finance.error })}</FormAlert>}
      </form>
    </Dialog>
  );
}
