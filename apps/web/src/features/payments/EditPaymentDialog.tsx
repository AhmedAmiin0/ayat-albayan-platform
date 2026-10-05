import { parseAmount } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { apiErrorText, studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { paidAtFor, updatePayment, type PaymentView } from './api';
import { paidAtDay } from './pay-day';
import { PaymentFields, type PaymentForm } from './PaymentFields';

/** «تعديل الدفعة»: amount, method, date, note (PATCH, audited; the package status follows). */
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
  const save = useMutation({
    mutationFn: (amount: number) =>
      updatePayment(payment.id, { amount, method: form.method, paidAt: paidAtFor(form.day), note: form.note.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MONEY_KEY });
      onClose();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(form.amount);
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
        <PaymentFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} currency={payment.currency} today={paidAtDay()} amountError={amountError} />
        {save.isError && <FormAlert>{apiErrorText(save.error, { ...t.payments.error, ...t.finance.error })}</FormAlert>}
      </form>
    </Dialog>
  );
}
