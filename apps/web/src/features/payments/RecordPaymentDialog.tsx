import { parseAmount } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Select } from '@/components/ui/select';
import { unpaidSubscriptionsQuery, type SubscriptionView } from '@/features/subscriptions/api';
import { apiErrorText, moneyText, packageName, studentLabel } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import { PaymentFields, type PaymentForm } from './PaymentFields';
import { ReceiptField, receiptProblem } from './ReceiptField';
import { useRecordPayment } from './use-record-payment';

type Props = { subscription?: SubscriptionView; onClose: () => void; onSaved: () => void };

const owed = (s: SubscriptionView) => Math.max(0, s.price - s.paid) || s.price;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
const optionText = (s: SubscriptionView) => `${studentLabel(s.student)} · ${packageName(s)} · ${moneyText(owed(s), s.currency)}`;

/** «تسجيل دفعة» (R-PAY-01): amount, method, date, receipt → the package turns active once paid. */
export function RecordPaymentDialog({ subscription, onClose, onSaved }: Props) {
  const formId = useId();
  const unpaid = useQuery({ ...unpaidSubscriptionsQuery, enabled: !subscription });
  const [picked, setPicked] = useState<SubscriptionView | null>(subscription ?? null);
  const [form, setForm] = useState<PaymentForm>({
    amount: subscription ? String(owed(subscription)) : '',
    method: 'bank',
    day: today(),
    note: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = useRecordPayment(onSaved);

  const pick = (id: string) => {
    const sub = unpaid.data?.items.find((s) => s.id === id) ?? null;
    setPicked(sub);
    if (sub) setForm((f) => ({ ...f, amount: String(owed(sub)) }));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file);
    setProblem(bad && t.payments.error[bad]);
    const amountOk = parseAmount(form.amount) !== null;
    setAmountError(amountOk ? null : form.amount.trim() ? t.payments.mobile.amountInvalid : t.common.required);
    if (!bad && amountOk && picked) save.mutate({ sub: picked, form, file });
  };

  return (
    <Dialog
      title={picked ? t.payments.mobile.recordFor.replace('{student}', studentLabel(picked.student)) : t.payments.record}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!picked || save.isPending}>
            {save.isPending ? t.payments.uploading : t.payments.record}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        {!subscription && (
          <Field label={t.payments.mobile.chooseSubscription} hint={unpaid.data?.total === 0 ? t.payments.noUnpaid : undefined}>
            {(p) => (
              <Select {...p} value={picked?.id ?? ''} onChange={(e) => pick(e.target.value)}>
                <option value="" disabled>
                  {t.payments.mobile.chooseSubscription}
                </option>
                {unpaid.data?.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {optionText(s)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {picked && (
          <p className="text-sm text-ink-2">
            {packageName(picked)} ·{' '}
            {t.payments.paidOf
              .replace('{paid}', moneyText(picked.paid, picked.currency))
              .replace('{price}', moneyText(picked.price, picked.currency))}
          </p>
        )}
        <PaymentFields
          form={form}
          set={(patch) => setForm((f) => ({ ...f, ...patch }))}
          currency={picked?.currency ?? ''}
          today={today()}
          amountError={amountError}
        />
        <ReceiptField file={file} onChange={setFile} error={problem} />
        {save.isError && <FormAlert>{uploadOrApiError(save.error)}</FormAlert>}
      </form>
    </Dialog>
  );
}

/**
 * A storage failure (not an ApiError) is the upload; no answer at all (fetch's TypeError) may
 * still have been recorded, so it says so (a retry is safe); anything else maps through payments.error.
 */
function uploadOrApiError(e: unknown): string {
  if (e instanceof TypeError) return t.payments.mobile.offline;
  const text = apiErrorText(e, t.payments.error);
  return text === t.common.error && e instanceof Error && e.name === 'StorageError' ? t.payments.mobile.uploadFailed : text;
}
