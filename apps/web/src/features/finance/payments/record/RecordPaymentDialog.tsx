import { CURRENCY_ISOS, parseAmount, type PaymentKind } from '@ab/shared';
import { useId, useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Select } from '@/components/ui/form/select';
import type { SubscriptionView } from '@/features/finance/subscriptions/api';
import { apiErrorText, currencySymbol, moneyText, packageName, studentLabel } from '@/features/finance/subscriptions';
import type { PickedStudent } from '@/features/finance/subscriptions/create/StudentPicker';
import { t } from '@/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/lib/settings/public-config';
import { AttachmentsField } from '../attachments/AttachmentsField';
import { paidAtDay } from './pay-day';
import { PaymentFields, type PaymentForm } from './PaymentFields';
import { ReceiptField, receiptProblem } from '../attachments/ReceiptField';
import { ShortfallNote } from './ShortfallNote';
import { SubscriptionPicker } from './SubscriptionPicker';
import { useRecordPayment } from './use-record-payment';

type Props = {
  subscription?: SubscriptionView;
  /** «سجّل كدفعة» from a booking: the invoice is the receipt, nothing to upload. */
  invoiceId?: string;
  /** «استرداد»: money given back, counted against what was paid. */
  kind?: PaymentKind;
  /** The student whose packages to offer (from an invoice). */
  student?: PickedStudent;
  onClose: () => void;
  onSaved: () => void;
};

const defaultAmount = (s: SubscriptionView, kind: PaymentKind) => String(kind === 'refund' ? s.paid : Math.max(0, s.price - s.paid) || s.price);
/** What a payment in `currency` still owes (owner 2026-10-28: less stays unpaid); null for a refund or another currency. */
const dueIn = (s: SubscriptionView | null, opts: { kind: PaymentKind; currency: string }): number | null =>
  s && opts.kind === 'payment' && opts.currency === s.currency ? Math.max(0, s.price - s.paid) : null;

/** «تسجيل دفعة» / «استرداد» (R-PAY-01): package, amount (any currency with a rate), method, date, receipt, and «المرفقات» for a bank payment. */
export function RecordPaymentDialog({ subscription, invoiceId, kind = 'payment', student: preset, onClose, onSaved }: Props) {
  const formId = useId();
  const maxBytes = useUploadMaxBytes();
  const [student, setStudent] = useState<PickedStudent | null>(preset ?? null);
  const [picked, setPicked] = useState<SubscriptionView | null>(subscription ?? null);
  const [form, setForm] = useState<PaymentForm>({ amount: subscription ? defaultAmount(subscription, kind) : '', method: 'bank', day: paidAtDay(), note: '' });
  const [currency, setCurrency] = useState(subscription?.currency ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const save = useRecordPayment(onSaved);
  const pick = (s: SubscriptionView | null) => {
    setPicked(s);
    if (s) setForm((f) => ({ ...f, amount: defaultAmount(s, kind) }));
    if (s) setCurrency(s.currency);
  };
  const setFields = (patch: Partial<PaymentForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    if (patch.method && patch.method !== 'bank') setAttachments([]);
  };
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const bad = receiptProblem(file, maxBytes);
    setProblem(bad && t.payments.error[bad]);
    const amountOk = parseAmount(form.amount) !== null;
    setAmountError(amountOk ? null : form.amount.trim() ? t.payments.mobile.amountInvalid : t.common.required);
    if (!bad && amountOk && picked) save.mutate({ sub: picked, form, file, attachments, currency: currency || picked.currency, kind, ...(invoiceId ? { invoiceId } : {}) });
  };
  const refund = kind === 'refund';
  const title = refund ? t.finance.refundTitle : picked ? t.payments.mobile.recordFor.replace('{student}', studentLabel(picked.student)) : t.payments.record;

  return (
    <Dialog
      title={title}
      onClose={onClose}
      actions={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} disabled={!picked || save.isPending}>
            {save.isPending ? t.payments.uploading : refund ? t.finance.refund : t.payments.record}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-5" onSubmit={submit} noValidate>
        {!subscription && <SubscriptionPicker student={student} onStudent={setStudent} picked={picked} onPick={pick} />}
        {picked && (
          <p className="text-sm text-ink-2">
            {packageName(picked)} ·{' '}
            {t.payments.paidOf.replace('{paid}', moneyText(picked.paid, picked.currency)).replace('{price}', moneyText(picked.price, picked.currency))}
          </p>
        )}
        <PaymentFields form={form} set={setFields} currency={currency} today={paidAtDay()} amountError={amountError} />
        <ShortfallNote amount={form.amount} due={dueIn(picked, { kind, currency })} currencyLabel={currencySymbol(currency)} />
        {picked && (
          <Field label={t.payments.currency} hint={currency !== picked.currency ? t.finance.convertedHint.replace('{currency}', picked.currency) : undefined}>
            {(p) => (
              <Select {...p} className="max-w-[180px]" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {[...new Set([picked.currency, ...CURRENCY_ISOS])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {invoiceId ? <p className="text-sm text-ink-2">{t.finance.invoiceAsReceipt}</p> : <ReceiptField file={file} onChange={setFile} error={problem} />}
        {form.method === 'bank' && <AttachmentsField files={attachments} onChange={setAttachments} maxBytes={maxBytes} />}
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
  const text = apiErrorText(e, { ...t.payments.error, ...t.finance.error });
  return text === t.common.error && e instanceof Error && e.name === 'StorageError' ? t.payments.mobile.uploadFailed : text;
}
