import { PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { paidAtDay } from '@/features/payments/pay-day';
import { ReceiptField, receiptProblem } from '@/features/payments/ReceiptField';
import { apiErrorText, moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import type { PayoutView } from './api';
import { usePayPayout } from './use-pay-payout';
import { teacherLabel } from '@/lib/teacher-label';
import { useUploadMaxBytes } from '@/lib/public-config';

type Props = { payout: PayoutView; onClose: () => void; onSaved: () => void };

/**
 * «تأكيد الدفع»: the cash still due (amount − what per-session payments covered), the transfer's
 * date, method, note and receipt. One request settles the ledger and marks the payout paid.
 */
export function PayPayoutDialog({ payout, onClose, onSaved }: Props) {
  const formId = useId();
  const due = Math.max(0, Math.round((payout.amount - (payout.ledger_paid ?? 0)) * 100) / 100);
  const maxBytes = useUploadMaxBytes();
  const [day, setDay] = useState(paidAtDay());
  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const save = usePayPayout(payout, onSaved);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file, maxBytes);
    setProblem(bad && t.payments.error[bad]);
    if (!bad) save.mutate({ day, method, note, file });
  };
  return (
    <Dialog
      title={t.finance.payPayoutTitle.replace('{teacher}', teacherLabel(payout.teacher))}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending ? t.earnings.saving : t.finance.confirmPaid}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">
          {t.finance.payPayoutDue.replace('{month}', payout.month).replace('{amount}', moneyText(due, 'EGP'))}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.payments.method}>
            {(p) => (
              <Select {...p} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t.enums.paymentMethod[m]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t.payments.paidAt}>
            {(p) => <Input {...p} type="date" dir="ltr" max={paidAtDay()} value={day} onChange={(e) => setDay(e.target.value)} />}
          </Field>
          <Field label={t.payments.note}>{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        </div>
        <ReceiptField file={file} onChange={setFile} error={problem} />
        {save.isError && <FormAlert>{apiErrorText(save.error, { ...t.payouts.error, ...t.earnings.error })}</FormAlert>}
      </form>
    </Dialog>
  );
}
