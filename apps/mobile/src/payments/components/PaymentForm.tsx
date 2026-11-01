import { PAYMENT_METHODS, type PaymentMethod, type StudentBalanceView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { useNow } from '@/core/lib/time/use-now';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { AmountField } from './AmountField';
import { AttachmentsField } from '@/payments/receipts/AttachmentsField';
import { FormLabel } from '@/payments/FormLabel';
import { PackagePicker } from './PackagePicker';
import { PaidDayPicker } from './PaidDayPicker';
import { ShortfallNote } from './ShortfallNote';
import { paymentErrorText } from '@/payments/lib/payment-errors';
import { checkDraft, chosenPackage, emptyDraft, payablePackages, type PaymentDraft, withMethod } from '@/payments/lib/payment-form';
import { ReceiptPicker } from '@/payments/ReceiptPicker';
import { useRecordPayment } from '@/payments/hooks/use-record-payment';

// '' = no method picked yet: the receipt says which one, so none is preselected.
const methodPills = (): FilterPill<PaymentMethod | ''>[] => PAYMENT_METHODS.map((m) => ({
  value: m,
  label: t.enums.paymentMethod[m],
}));

/** While saving: «جارٍ الرفع…» when a photo goes up first, else «جارٍ الحفظ…». */
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

/**
 * «سجّل دفعة» (R-PAY-01, R-MOB-02): package, amount in its currency, method, day, then a bank
 * transfer's «المرفقات» (up to 5) or another method's receipt photo.
 * Errors show once a save was tried; a refused save keeps everything typed and picked.
 */
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
      <ShortfallNote amountText={draft.amountText} due={sub.price - sub.paid} currency={sub.currency} />
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
