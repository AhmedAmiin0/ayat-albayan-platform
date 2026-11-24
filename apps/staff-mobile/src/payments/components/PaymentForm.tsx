import { PAYMENT_METHODS, type PaymentMethod } from '@ab/catalog';
import { dueOf, type StudentBalanceView } from '@ab/money';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, FilterPills, type FilterPill, ErrorLine, useNow, FormLabel } from '@ab/mobile-kit';
import { AmountField } from './AmountField';
import { AttachmentsField } from '@/payments/receipts/AttachmentsField';
import { PackagePicker } from './PackagePicker';
import { PaidDayPicker } from '@/core/ui/form/PaidDayPicker';
import { ShortfallNote } from './ShortfallNote';
import { paymentErrorText } from '@/core/lib/money/payment-errors';
import { checkDraft, chosenPackage, emptyDraft, payablePackages, type PaymentDraft, withMethod } from '@/payments/lib/payment-form';
import { ReceiptPicker } from '@/core/ui/form/ReceiptPicker';
import { useRecordPayment } from '@/payments/hooks/use-record-payment';

// '' = no method picked yet: the receipt says which one, so none is preselected.
const methodPills = (): FilterPill<PaymentMethod | ''>[] => PAYMENT_METHODS.map((m) => ({
  value: m,
  label: t.enums.paymentMethod[m],
}));

function submitLabel(pending: boolean, draft: PaymentDraft): string {
  if (!pending) return t.payments.mobile.record;
  return draft.receipt || draft.attachments.some((a) => a.kind === 'file') ? t.payments.uploading : t.common.saving;
}

interface PaymentFormProps {
  studentId: string;
  /** Has a current package (the screen shows the empty state otherwise). */
  balance: StudentBalanceView;
  /** The last read got no answer from the network: nothing may be sent until a retry gets one. */
  offline: boolean;
  onRetry: () => void;
  /** After the API recorded the payment. */
  onDone: () => void;
}

/** R-PAY-01, R-MOB-02: bank transfers take up to 5 attachments; a refused save keeps all input. */
export function PaymentForm({ studentId, balance, offline, onRetry, onDone }: PaymentFormProps) {
  const now = useNow();
  const record = useRecordPayment(studentId);
  const [draft, setDraft] = useState<PaymentDraft>(emptyDraft);
  const [tried, setTried] = useState(false);
  const sub = chosenPackage(balance, draft.subscriptionId);
  if (!sub) return null;
  const check = checkDraft(draft, { sub, now });
  const errors = tried ? check.errors : {};
  const set = (patch: Partial<PaymentDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    setTried(true);
    if (check.input) record.mutate(check.input, { onSuccess: onDone });
  };
  const failure = offline
    ? t.payments.mobile.offline
    : record.isError
      ? paymentErrorText(record.error)
      : undefined;

  return (
    <View style={{ gap: 20 }}>
      <PackagePicker
        packages={payablePackages(balance)}
        value={sub}
        onChange={(subscriptionId) => set({ subscriptionId })}
      />
      <AmountField
        value={draft.amountText}
        onChange={(amountText) => set({ amountText })}
        currency={sub.currency}
        error={errors.amount}
      />
      <ShortfallNote amountText={draft.amountText} due={dueOf(sub, sub.paid)} currency={sub.currency} />
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.payments.method}
          items={methodPills()}
          value={draft.method ?? ''}
          onChange={(method) => (method ? setDraft((d) => withMethod(d, method)) : undefined)}
        />
        {errors.method ? <ErrorLine message={errors.method} /> : null}
      </View>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      {draft.method === 'bank' ? (
        <AttachmentsField value={draft.attachments} onChange={(attachments) => set({ attachments })} />
      ) : (
        <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      )}
      {failure ? <ErrorLine message={failure} /> : null}
      {offline ? (
        <Button variant="secondary" label={t.mobile.retry} onPress={onRetry} />
      ) : (
        <Button label={submitLabel(record.isPending, draft)} onPress={submit} busy={record.isPending} />
      )}
    </View>
  );
}
