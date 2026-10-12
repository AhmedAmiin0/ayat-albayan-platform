import { parseAmount, type SalesMoneySubscriptionView, type SalesPaymentView } from '@ab/shared';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { receiptProblem } from '@/features/payments/ReceiptField';
import { moneyText, packageName, studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { useUploadMaxBytes } from '@/lib/public-config';
import { salesErrorText } from './errors';
import { PackagePicker } from './PackagePicker';
import { ReceiptChooser } from './ReceiptChooser';
import { receiptFor, type ReceiptChoice } from './receipt';
import { TransferFields } from './TransferFields';
import { useSalesPayment, type TransferForm } from './use-sales-payment';

type Props = {
  /** The package just created in step 1; else she picks one of `packages`. */
  fixed: SalesMoneySubscriptionView | null;
  packages: SalesMoneySubscriptionView[];
  onClose: () => void;
  onSaved: (payment: SalesPaymentView) => void;
};

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
const formFor = (s: SalesMoneySubscriptionView | undefined): TransferForm => ({
  amount: s ? String(s.due || s.price) : '',
  currency: s?.currency ?? '',
  day: today(),
  note: '',
});

/** Step 2 «سجّل التحويل البنكي» (R-ASST-04): the receipt is required, the amount starts at what is due. */
export function SalesTransferStep({ fixed, packages, onClose, onSaved }: Props) {
  const formId = useId();
  const maxBytes = useUploadMaxBytes();
  const [pickedId, setPickedId] = useState(() => fixed?.id ?? (packages.length === 1 ? (packages[0]?.id ?? '') : ''));
  const sub = fixed ?? packages.find((p) => p.id === pickedId);
  const [form, setForm] = useState<TransferForm>(() => formFor(sub));
  const [choice, setChoice] = useState<ReceiptChoice | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = useSalesPayment(onSaved);
  const receipt = sub ? receiptFor(choice, sub.id) : null;

  const choose = (next: ReceiptChoice | null) => {
    setChoice(next);
    setProblem(null);
  };
  const pick = (id: string) => {
    setPickedId(id);
    setForm(formFor(packages.find((p) => p.id === id)));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!sub || save.isPending) return;
    const bad = receipt?.kind === 'file' ? receiptProblem(receipt.file, maxBytes) : null;
    setProblem(receipt ? bad && t.salesMoney.error[bad] : t.salesMoney.receiptRequired);
    const amountOk = (parseAmount(form.amount) ?? 0) > 0;
    setAmountError(amountOk ? null : t.salesMoney.error.amount);
    if (receipt && !bad && amountOk) save.mutate({ sub, form, receipt });
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
            <ReceiptChooser sub={sub} value={receipt} onChange={choose} error={problem} />
            <TransferFields form={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} packageCurrency={sub.currency} today={today()} amountError={amountError} />
          </>
        )}
        {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}
