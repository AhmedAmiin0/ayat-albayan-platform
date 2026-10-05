import { amountProblem, earningIdsOf, parseAmount, payCeiling, type TeacherEarningView } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { paidAtDay } from '@/features/payments/pay-day';
import { PaymentFields, type PaymentForm } from '@/features/payments/PaymentFields';
import { ReceiptField, receiptProblem } from '@/features/payments/ReceiptField';
import { apiErrorText, moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { usePayTeacher } from './use-pay-teacher';
import { useUploadMaxBytes } from '@/lib/public-config';

type Props = {
  teacher: { id: string; name: string };
  selected: ReadonlyMap<string, TeacherEarningView>;
  /** The teacher's whole outstanding balance (used when no session is ticked). */
  outstanding: number;
  onClose: () => void;
  onSaved: (replayed: boolean) => void;
};

/** «تسجيل دفعة للمعلم/ة»: amount (default = what the ticked sessions owe), method, date, receipt, note. */
export function PayDialog({ teacher, selected, outstanding, onClose, onSaved }: Props) {
  const formId = useId();
  const ceiling = payCeiling(selected, outstanding);
  const maxBytes = useUploadMaxBytes();
  const [form, setForm] = useState<PaymentForm>({ amount: String(ceiling), method: 'bank', day: paidAtDay(), note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = usePayTeacher(teacher.id, onSaved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file, maxBytes);
    setProblem(bad && t.payments.error[bad]);
    const amount = parseAmount(form.amount);
    const why = amountProblem({ amount, text: form.amount, ceiling });
    const texts = {
      required: t.common.required,
      invalid: t.payments.mobile.amountInvalid,
      overpayment: t.earnings.overpayment.replace('{amount}', moneyText(ceiling, 'EGP')),
    };
    setAmountError(why && texts[why]);
    if (!bad && !why) save.mutate({ form, file, earningIds: earningIdsOf(selected) });
  };

  return (
    <Dialog
      title={t.earnings.payFor.replace('{teacher}', teacher.name)}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending || ceiling <= 0}>
            {save.isPending ? t.earnings.saving : t.earnings.confirm}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">
          {selected.size > 0
            ? t.earnings.chosenSummary.replace('{count}', String(selected.size)).replace('{amount}', moneyText(ceiling, 'EGP'))
            : `${t.earnings.payAll}: ${moneyText(ceiling, 'EGP')}`}
        </p>
        <PaymentFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} currency="EGP" today={paidAtDay()} amountError={amountError} />
        <p className="text-xs text-ink-3">{t.earnings.allocation}</p>
        <ReceiptField file={file} onChange={setFile} error={problem} />
        {save.isError && <FormAlert>{payErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

/** No answer at all (fetch's TypeError) may still have been recorded: a retry is safe. A storage failure is the upload. */
function payErrorText(e: unknown): string {
  if (e instanceof TypeError) return t.payments.mobile.offline;
  const text = apiErrorText(e, t.earnings.error);
  return text === t.common.error && e instanceof Error && e.name === 'StorageError' ? t.payments.mobile.uploadFailed : text;
}
