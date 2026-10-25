import { parseAmount, type SalesMoneySubscriptionView, type SalesPaymentView } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { moneyText, packageName, studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/lib/settings/public-config';
import { salesErrorText } from '../errors';
import { PackagePicker } from './PackagePicker';
import { ReceiptChooser } from './ReceiptChooser';
import { attachmentsFor, type ReceiptChoice } from './receipt';
import { TransferFields } from './TransferFields';
import { useSalesPayment, type TransferForm } from './use-sales-payment';

type Props = {
  /** The package just created in step 1; else she picks one of `packages`. */
  fixed: SalesMoneySubscriptionView | null;
  packages: SalesMoneySubscriptionView[];
  onClose: () => void;
  onSaved: (payment: SalesPaymentView) => void;
  /** Right after «اشتراك جديد»: «احجز أيام الحلقات الآن» for the new package's student. */
  onBookCourse?: (() => void) | undefined;
};

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
const formFor = (s: SalesMoneySubscriptionView | undefined): TransferForm => ({
  amount: s ? String(s.due || s.price) : '',
  day: today(),
  note: '',
});

/** Step 2 «سجّل التحويل البنكي» (R-ASST-04): «المرفقات» optional (up to five), the amount starts at what is due. */
export function SalesTransferStep({ fixed, packages, onClose, onSaved, onBookCourse }: Props) {
  const formId = useId();
  const maxBytes = useUploadMaxBytes();
  const [pickedId, setPickedId] = useState(() => fixed?.id ?? (packages.length === 1 ? (packages[0]?.id ?? '') : ''));
  const sub = fixed ?? packages.find((p) => p.id === pickedId);
  const [form, setForm] = useState<TransferForm>(() => formFor(sub));
  const [chosen, setChosen] = useState<ReceiptChoice[]>([]);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = useSalesPayment(onSaved);
  const attachments = sub ? attachmentsFor(chosen, sub.id) : [];

  const pick = (id: string) => {
    setPickedId(id);
    setForm(formFor(packages.find((p) => p.id === id)));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!sub || save.isPending) return;
    const amountOk = (parseAmount(form.amount) ?? 0) > 0;
    setAmountError(amountOk ? null : t.salesMoney.error.amount);
    if (amountOk) save.mutate({ sub, form, attachments });
  };

  return (
    <Dialog
      title={t.salesMoney.stepTransfer}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!sub || save.isPending}>
            {save.isPending ? t.salesMoney.saving : t.salesMoney.saveTransfer}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        {!fixed && <PackagePicker packages={packages} value={pickedId} onChange={pick} />}
        {sub && (
          <>
            <p className="text-sm text-ink-2">
              {t.salesMoney.packageFor.replace('{student}', studentLabel(sub.student))} · {packageName(sub)} ·{' '}
              {t.salesMoney.due.replace('{amount}', moneyText(sub.due, sub.currency))}
            </p>
            {onBookCourse && (
              <Button type="button" variant="secondary" className="justify-self-start" onClick={onBookCourse}>
                {t.booking.bookCourseDays}
              </Button>
            )}
            <ReceiptChooser sub={sub} value={attachments} onChange={setChosen} maxBytes={maxBytes} />
            <TransferFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} packageCurrency={sub.currency} today={today()} amountError={amountError} />
          </>
        )}
        {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
