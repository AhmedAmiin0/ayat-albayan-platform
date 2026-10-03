import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { ReceiptField, receiptProblem } from '@/features/payments/ReceiptField';
import { apiErrorText, moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { checkAmount, type AmountProblem } from './pay-amount';
import { PayFields, type PayForm } from './PayFields';
import { usePayTeacher } from './use-pay-teacher';

type Props = {
  teacherId: string;
  /** The ticked sessions (empty = every open one) and what is still owed on them. */
  earningIds: string[];
  due: number;
  onClose: () => void;
  onSaved: () => void;
};

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });

const amountText = (p: AmountProblem): string =>
  p === 'required' ? t.common.required : p === 'over' ? t.teacherEarnings.error.over_payment : t.payments.mobile.amountInvalid;

/** A storage failure is the upload; no answer at all may still have been recorded (a retry is safe). */
function failureText(e: unknown): string {
  if (e instanceof TypeError) return t.payments.mobile.offline;
  const text = apiErrorText(e, t.teacherEarnings.error);
  return text === t.common.error && e instanceof Error && e.name === 'StorageError' ? t.payments.mobile.uploadFailed : text;
}

/** «تسجيل دفعة للمعلم/ة»: amount prefilled with what is due, partial allowed, optional receipt. */
export function PayDialog({ teacherId, earningIds, due, onClose, onSaved }: Props) {
  const tt = t.teacherEarnings;
  const formId = useId();
  const [form, setForm] = useState<PayForm>({ amount: String(due), method: 'bank', day: today(), note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = usePayTeacher(teacherId, onSaved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file);
    setReceiptError(bad && t.payments.error[bad]);
    const checked = checkAmount(form.amount, due);
    setAmountError('problem' in checked ? amountText(checked.problem) : null);
    if (!bad && 'amount' in checked) save.mutate({ ...form, amount: checked.amount, file, earningIds });
  };

  return (
    <Dialog
      title={tt.dialogTitle}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending}>
            {save.isPending && file ? tt.receiptUploading : tt.submit}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        <p className="text-sm text-ink-2">{tt.selectedDue.replace('{amount}', moneyText(due, 'EGP'))}</p>
        <PayFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} today={today()} amountError={amountError} />
        <p className="text-xs text-ink-3">{tt.allocationHint}</p>
        <ReceiptField file={file} onChange={setFile} error={receiptError} />
        {save.isError && <FormAlert>{failureText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
