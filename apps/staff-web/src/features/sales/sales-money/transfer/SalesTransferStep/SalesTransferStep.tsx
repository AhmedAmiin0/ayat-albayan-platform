import type { SalesMoneySubscriptionView, SalesPaymentView } from '@ab/shared';
import { cancelOffered, parseAmount } from '@ab/money';
import { useId, useState, type SubmitEvent } from 'react';
import { Button, Dialog, FormAlert, t, useUploadMaxBytes } from '@ab/web-kit';
import { CancelPackageDialog, todayIn } from '@/features/finance/subscriptions';
import { currencySymbol, packageName, studentLabel } from '@/features/finance/subscriptions';
import { ShortfallNote } from '@/features/finance/payments';
import { cancelSalesSubscription, SALES_MONEY_KEY, type Bind } from '@/features/sales/sales-money/api';
import { salesErrorText } from '@/features/sales/sales-money/errors';
import { PackagePicker } from '@/features/sales/sales-money/transfer/PackagePicker';
import { ReceiptChooser } from '@/features/sales/sales-money/transfer/ReceiptChooser';
import { attachmentsFor, type ReceiptChoice } from '@/features/sales/sales-money/transfer/receipt';
import { dueLine } from '@/features/sales/sales-money/transfer/due-line';
import { TransferFields } from '@/features/sales/sales-money/transfer/TransferFields';
import { useSalesPayment, type TransferForm } from '@/features/sales/sales-money/transfer/use-sales-payment';

interface Props {
  /** The package just created in step 1; else she picks one of `packages`. */
  fixed: SalesMoneySubscriptionView | null;
  packages: SalesMoneySubscriptionView[];
  onClose: () => void;
  onSaved: (payment: SalesPaymentView) => void;
  /** Books the course days for the new package's student. */
  onBookCourse?: (() => void) | undefined;
  /** The chat's phone for a child not hers (sales.renew_any): transfer only, never cancel. */
  bindOf?: ((studentId: string) => Bind) | undefined;
}

const formFor = (s: SalesMoneySubscriptionView | undefined, day: string): TransferForm => ({
  amount: s ? String(s.due || s.price) : '',
  day,
  note: '',
});

/** A smaller amount leaves the package unpaid but still saves (R-ASST-04). */
export function SalesTransferStep({
  fixed,
  packages,
  onClose,
  onSaved,
  onBookCourse,
  bindOf,
}: Props) {
  const formId = useId();
  const maxBytes = useUploadMaxBytes();
  const [pickedId, setPickedId] = useState(() => fixed?.id ?? (packages.length === 1 ? (packages[0]?.id ?? '') : ''));
  const sub = fixed ?? packages.find((p) => p.id === pickedId);
  // Riyadh's day when the dialog opened, held (as SalesSubscribeStep): the default day and the
  // date field's max. A dialog left open past midnight keeps it until it is opened again.
  const [today] = useState(() => todayIn('Asia/Riyadh'));
  const [form, setForm] = useState<TransferForm>(() => formFor(sub, today));
  const [chosen, setChosen] = useState<ReceiptChoice[]>([]);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const bind = sub && bindOf ? bindOf(sub.student.id) : {};
  const save = useSalesPayment(onSaved, bind);
  const attachments = sub ? attachmentsFor(chosen, sub.id) : [];

  const pick = (id: string) => {
    setPickedId(id);
    setForm(formFor(packages.find((p) => p.id === id), today));
  };
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!sub || save.isPending) return;
    const amountOk = (parseAmount(form.amount) ?? 0) > 0;
    setAmountError(amountOk ? null : t.salesMoney.error.amount);
    if (amountOk) save.mutate({ sub, form, attachments });
  };

  return (
    <>
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
                {t.salesMoney.packageFor.replace('{student}', studentLabel(sub.student))} · {packageName(sub)} · {dueLine(sub)}
              </p>
              {cancelOffered(sub) && !bind.phone && (
                <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => setCancelling(true)}>
                  {t.subscriptions.cancel.action}
                </Button>
              )}
              {onBookCourse && (
                <Button type="button" variant="secondary" className="justify-self-start" onClick={onBookCourse}>
                  {t.booking.bookCourseDays}
                </Button>
              )}
              <ReceiptChooser
                sub={sub}
                value={attachments}
                onChange={setChosen}
                maxBytes={maxBytes}
                bind={bind}
              />
              <TransferFields
                form={form}
                set={(patch) => setForm((f) => ({ ...f, ...patch }))}
                packageCurrency={sub.currency}
                today={today}
                amountError={amountError}
              />
              <ShortfallNote
                amount={form.amount}
                due={sub.due}
                currencyLabel={currencySymbol(sub.currency)}
              />
            </>
          )}
          {save.isError && <FormAlert>{salesErrorText(save.error)}</FormAlert>}
        </form>
      </Dialog>
      {cancelling && sub && (
        <CancelPackageDialog
          label={`${packageName(sub)} · ${studentLabel(sub.student)}`}
          cancel={(body) => cancelSalesSubscription(sub.id, body)}
          staleKey={SALES_MONEY_KEY}
          onClose={() => setCancelling(false)}
          onDone={onClose}
        />
      )}
    </>
  );
}
